import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Loader2, ShieldAlert } from "lucide-react";
import { sha256HexSync } from "@/lib/sha256";
import {
  getBotShieldConfig,
  issueBotChallenge,
  verifyBotChallenge,
  type PublicBotConfig,
} from "@/lib/bot-shield.functions";

type Purpose = "signup" | "login" | "reset" | "contact";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

/** Solve sha256(salt:nonce) with `difficulty` leading zeros — cheap for humans, costly for bulk bots. */
async function solve(salt: string, difficulty: number): Promise<string> {
  const prefix = "0".repeat(difficulty);
  const CHUNK = 4000;
  for (let nonce = 0; nonce < 20_000_000; nonce++) {
    if (nonce > 0 && nonce % CHUNK === 0) await new Promise((r) => setTimeout(r, 0));
    if (sha256HexSync(`${salt}:${nonce}`).startsWith(prefix)) return String(nonce);
  }
  throw new Error("Verification timed out");
}

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve(), { once: true }));
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.dataset.turnstile = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load verification"));
    document.head.appendChild(s);
  });
}

export type BotShieldHandle = {
  /** Runs verification and resolves with a single-use pass token. Throws on failure. */
  getToken: () => Promise<string>;
  /** Forget the cached pass so the next attempt gets a fresh one (tokens are single-use). */
  reset: () => void;
  ready: boolean;
};

/**
 * Invisible-first human verification.
 *
 * Layers: honeypot field + minimum fill time + proof-of-work, plus Cloudflare
 * Turnstile when it is enabled in Admin → DDoS & Bot Protection.
 */
export function BotShield({
  purpose,
  onReady,
  className = "",
}: {
  purpose: Purpose;
  onReady?: (handle: BotShieldHandle) => void;
  className?: string;
}) {
  const loadConfig = useServerFn(getBotShieldConfig);
  const newChallenge = useServerFn(issueBotChallenge);
  const verify = useServerFn(verifyBotChallenge);

  const [config, setConfig] = useState<PublicBotConfig | null>(null);
  const [state, setState] = useState<"idle" | "working" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const mountedAt = useRef<number>(Date.now());
  const honeypotRef = useRef<HTMLInputElement>(null);
  const turnstileBox = useRef<HTMLDivElement>(null);
  const turnstileToken = useRef<string>("");
  const cachedToken = useRef<string>("");

  useEffect(() => {
    let alive = true;
    loadConfig()
      .then((c) => alive && setConfig(c))
      .catch(() => alive && setConfig({ enabled: false, powEnabled: false, turnstileEnabled: false, turnstileSiteKey: "" }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render Turnstile widget when enabled.
  useEffect(() => {
    if (!config?.enabled || !config.turnstileEnabled || !config.turnstileSiteKey) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !turnstileBox.current || !window.turnstile) return;
        turnstileBox.current.innerHTML = "";
        window.turnstile.render(turnstileBox.current, {
          sitekey: config.turnstileSiteKey,
          theme: "light",
          callback: (token: string) => {
            turnstileToken.current = token;
          },
          "expired-callback": () => {
            turnstileToken.current = "";
          },
        });
      })
      .catch(() => setMessage("Verification widget could not load."));
    return () => {
      cancelled = true;
    };
  }, [config?.enabled, config?.turnstileEnabled, config?.turnstileSiteKey]);

  const getToken = useCallback(async (): Promise<string> => {
    if (!config || !config.enabled) return "";
    if (cachedToken.current) return cachedToken.current;
    setState("working");
    setMessage(null);
    try {
      let challengeId: string | undefined;
      let nonce: string | undefined;
      if (config.powEnabled) {
        const challenge = await newChallenge({ data: { purpose } });
        if (challenge) {
          challengeId = challenge.id;
          nonce = await solve(challenge.salt, challenge.difficulty);
        }
      }
      const result = await verify({
        data: {
          purpose,
          ...(challengeId ? { challengeId } : {}),
          ...(nonce ? { nonce } : {}),
          ...(turnstileToken.current ? { turnstileToken: turnstileToken.current } : {}),
          elapsedMs: Math.min(86_400_000, Date.now() - mountedAt.current),
          honeypot: honeypotRef.current?.value ?? "",
        },
      });
      if (!result.ok || !result.token) {
        setState("error");
        setMessage(result.reason || "Human verification failed.");
        throw new Error(result.reason || "Human verification failed.");
      }
      cachedToken.current = result.token;
      setState("ok");
      return result.token;
    } catch (e) {
      setState("error");
      const msg = e instanceof Error ? e.message : "Human verification failed.";
      setMessage(msg);
      throw new Error(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, purpose]);

  const reset = useCallback(() => {
    cachedToken.current = "";
    turnstileToken.current = "";
    mountedAt.current = Date.now();
    setState("idle");
    setMessage(null);
    try {
      window.turnstile?.reset();
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (config) onReady?.({ getToken, reset, ready: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, getToken, reset]);

  if (!config?.enabled) return null;

  return (
    <div className={className}>
      {/* Honeypot — hidden from humans, irresistible to bots */}
      <input
        ref={honeypotRef}
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none h-0 w-0 -z-10"
      />

      {config.turnstileEnabled && <div ref={turnstileBox} className="flex justify-center my-2" />}

      <div
        className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-[12.5px] font-medium ${
          state === "error"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : state === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-violet-200 bg-violet-50/70 text-violet-700"
        }`}
        aria-live="polite"
      >
        {state === "working" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying you are human…
          </>
        ) : state === "error" ? (
          <>
            <ShieldAlert className="w-3.5 h-3.5" /> {message}
          </>
        ) : state === "ok" ? (
          <>
            <ShieldCheck className="w-3.5 h-3.5" /> Verified — you are human
          </>
        ) : (
          <>
            <ShieldCheck className="w-3.5 h-3.5" /> Protected by Rama Sub security shield
          </>
        )}
      </div>
    </div>
  );
}
