import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2, CheckCircle2, XCircle, KeyRound, Zap, RefreshCw, Info, ExternalLink,
  ShieldCheck, AlertTriangle, Copy, Check,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getBkashStatus, testBkashConnection } from "@/lib/bkash.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/Mahbub214/bkash-pgw")({
  component: BkashPgw,
});

type Status = Awaited<ReturnType<typeof getBkashStatus>>;

const SECRETS: Array<{ name: string; label: string; hint: string }> = [
  { name: "BKASH_APP_KEY", label: "App Key", hint: "bKash Merchant → API credentials" },
  { name: "BKASH_APP_SECRET", label: "App Secret", hint: "bKash Merchant → API credentials" },
  { name: "BKASH_USERNAME", label: "Username", hint: "bKash Merchant → API user" },
  { name: "BKASH_PASSWORD", label: "Password", hint: "bKash Merchant → API password" },
  { name: "BKASH_MODE", label: "Mode", hint: `"sandbox" বা "live"` },
];

function BkashPgw() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchStatus = useServerFn(getBkashStatus);
  const testFn = useServerFn(testBkashConnection);

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetchStatus();
      setStatus(s);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load status");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const r = await testFn({ data: {} });
      if (r.ok) setResult({ ok: true, msg: `Grant token OK · ${r.tokenPreview}` });
      else setResult({ ok: false, msg: r.error || "Failed" });
    } catch (e: any) {
      setResult({ ok: false, msg: e?.message || "Failed" });
    } finally {
      setTesting(false);
    }
  };

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/bkash/callback`
      : "/api/public/bkash/callback";

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Top status card */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg">
              <Zap className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">bKash Tokenized Checkout</h3>
              <p className="text-xs text-slate-500">Merchant API দিয়ে সরাসরি bKash পেমেন্ট নিন</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.ready ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-3 py-1 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-3 py-1 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Setup required
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                status?.mode === "live"
                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                  : "bg-sky-50 text-sky-700 ring-sky-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> {status?.mode?.toUpperCase() || "SANDBOX"}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={test}
            disabled={testing || !status?.ready}
            className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Test Connection
          </button>
          {result && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
                result.ok
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-rose-50 text-rose-700 ring-rose-200"
              }`}
            >
              {result.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {result.msg}
            </span>
          )}
        </div>
      </div>

      {/* Credentials */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-violet-600" />
          <h3 className="font-semibold text-slate-900">API Credentials</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          নিরাপত্তার জন্য bKash credentials গুলো encrypted secret হিসেবে সংরক্ষণ হয়। যোগ/আপডেট করতে <b>Add / Update secret</b> বাটনটি ব্যবহার করুন।
        </p>
        <div className="grid gap-2">
          {loading ? (
            <div className="py-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : (
            SECRETS.map((s) => {
              const set = s.name === "BKASH_MODE" ? !!status?.mode : (status?.has as any)?.[s.name.replace("BKASH_", "").toLowerCase()];
              return (
                <div key={s.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      <code className="text-xs bg-white px-1.5 py-0.5 rounded ring-1 ring-slate-200">{s.name}</code>
                      <span className="text-slate-500">— {s.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.hint}</div>
                  </div>
                  {set ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Set
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200 px-2 py-0.5 text-xs font-medium">
                      <XCircle className="w-3 h-3" /> Missing
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Callback URL */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          <ExternalLink className="w-4 h-4 text-violet-600" />
          <h3 className="font-semibold text-slate-900">Callback URL</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          এই URL টি bKash Merchant panel-এ Whitelisted URL হিসেবে যোগ করুন।
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 ring-1 ring-slate-200 px-3 py-2">
          <code className="text-xs sm:text-sm text-slate-800 flex-1 truncate">{callbackUrl}</code>
          <button
            onClick={() => copy(callbackUrl)}
            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs ring-1 ring-slate-200 hover:bg-slate-100"
          >
            {copied === callbackUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            Copy
          </button>
        </div>
      </div>

      {/* Guide */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-violet-50 ring-1 ring-sky-100 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-sky-600" />
          <h3 className="font-semibold text-slate-900">সেটআপ গাইড</h3>
        </div>
        <ol className="text-sm text-slate-700 space-y-2 list-decimal pl-5">
          <li>bKash Merchant portal (<a className="text-sky-700 underline" href="https://merchant.bka.sh" target="_blank" rel="noreferrer">merchant.bka.sh</a>) থেকে API credentials সংগ্রহ করুন।</li>
          <li>উপরের Callback URL টি Merchant panel-এ Whitelist করুন।</li>
          <li>এই page-এ <b>BKASH_APP_KEY</b>, <b>BKASH_APP_SECRET</b>, <b>BKASH_USERNAME</b>, <b>BKASH_PASSWORD</b> secret গুলো add করুন। প্রথমে <b>BKASH_MODE=sandbox</b> রেখে test করুন।</li>
          <li><b>Test Connection</b> সফল হলে, <b>BKASH_MODE=live</b> করে দিন।</li>
          <li>Checkout page-এ bKash option select করলে গ্রাহক সরাসরি bKash payment portal-এ redirect হবে।</li>
        </ol>
      </div>
    </div>
  );
}
