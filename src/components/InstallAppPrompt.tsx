import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Share, X, Plus, ChevronUp, ChevronDown, Smartphone, Tablet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ramaLogoAsset from "@/assets/rama-logo-new.png.asset.json";
const ramaLogo = ramaLogoAsset.url;

// Auto-hide the install banner after this many milliseconds so it doesn't
// stay on screen indefinitely.
const AUTO_HIDE_MS = 12_000;


interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

type IosKind = "none" | "iphone" | "ipad";

function detectIos(): IosKind {
  if (typeof window === "undefined") return "none";
  const ua = window.navigator.userAgent;
  const isIpad =
    /iPad/.test(ua) ||
    // iPadOS 13+ reports as Mac with touch
    (navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  if (isIpad) return "ipad";
  if (/iPhone|iPod/.test(ua)) return "iphone";
  return "none";
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // Exclude in-app browsers and Chrome/Firefox on iOS
  return !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\//i.test(ua);
}

function pageLabel(pathname: string): string {
  if (pathname === "/") return "হোম পেজ";
  if (pathname.startsWith("/products")) return "প্রোডাক্ট পেজ";
  if (pathname.startsWith("/product/")) return "এই প্রোডাক্ট পেজ";
  if (pathname.startsWith("/categories")) return "ক্যাটাগরি পেজ";
  if (pathname.startsWith("/dashboard")) return "ড্যাশবোর্ড";
  if (pathname.startsWith("/wallet")) return "ওয়ালেট";
  if (pathname.startsWith("/checkout")) return "চেকআউট";
  if (pathname.startsWith("/cart")) return "কার্ট";
  return "এই পেজ";
}

export function InstallAppPrompt() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosKind, setIosKind] = useState<IosKind>("none");
  const [iosSafari, setIosSafari] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const recently = Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;

    const kind = detectIos();
    setIosKind(kind);
    setIosSafari(isIosSafari());

    if (kind !== "none") {
      if (!recently) setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!recently) setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setVisible(false);
      setDeferred(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Auto-hide the banner after a short delay so it doesn't linger.
  // The iOS instructions dialog (iosOpen) is exempt so the user can read it.
  useEffect(() => {
    if (!visible || iosOpen) return;
    const t = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [visible, iosOpen]);

  const isIosDevice = iosKind !== "none";


  const handleInstall = async () => {
    if (isIosDevice) {
      setIosOpen(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      setDeferred(null);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  // iPhone: Share button is at bottom of Safari. iPad: top-right.
  const shareLocation = iosKind === "ipad" ? "উপরে ডানপাশে" : "নিচে মাঝখানে";
  const ShareDirectionIcon = iosKind === "ipad" ? ChevronUp : ChevronDown;
  const DeviceIcon = iosKind === "ipad" ? Tablet : Smartphone;
  const deviceName = iosKind === "ipad" ? "iPad" : "iPhone";

  return (
    <>
      <div
        className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur md:bottom-6 md:left-auto md:right-6"
        role="dialog"
        aria-label="অ্যাপ ইনস্টল করুন"
      >
        <button
          onClick={handleDismiss}
          aria-label="বন্ধ করুন"
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-primary/20 shadow-sm overflow-hidden">
            {isIosDevice
              ? <DeviceIcon className="h-5 w-5 text-primary" />
              : <img src={ramaLogo} alt="RamaSub" className="h-9 w-9 object-contain p-[1px]" draggable={false} />}
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              RamaSub অ্যাপ ইনস্টল করুন
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isIosDevice
                ? `${deviceName}-এর হোম স্ক্রিনে যোগ করুন — দ্রুত অ্যাকসেস।`
                : "হোম স্ক্রিনে যোগ করে দ্রুত অ্যাকসেস নিন।"}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleInstall}>
                {isIosDevice ? "কীভাবে ইনস্টল করবো?" : "ইনস্টল করুন"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                পরে
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DeviceIcon className="h-5 w-5 text-primary" />
              {deviceName}-এ Home Screen-এ যোগ করুন
            </DialogTitle>
            <DialogDescription>
              আপনি এখন <span className="font-semibold text-foreground">{pageLabel(pathname)}</span>-এ আছেন।
              এই অ্যাপটি একদম একটি native app-এর মতোই চলবে।
            </DialogDescription>
          </DialogHeader>

          {!iosSafari && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                ইনস্টল করতে অবশ্যই <strong>Safari</strong> ব্রাউজার ব্যবহার করুন। Chrome / Facebook / Instagram-এর in-app browser থেকে এটি কাজ করবে না।
                ঠিকানা copy করে Safari-তে খুলুন।
              </span>
            </div>
          )}

          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                ১
              </span>
              <div className="flex-1">
                <p className="font-medium text-foreground">Share বাটনে ট্যাপ করুন</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  Safari-এর <span className="font-semibold text-foreground">{shareLocation}</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
                    <Share className="h-3.5 w-3.5" />
                    Share
                  </span>
                  <ShareDirectionIcon className="h-4 w-4 text-primary" />
                  আইকনে ট্যাপ করুন।
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                ২
              </span>
              <div className="flex-1">
                <p className="font-medium text-foreground">"Add to Home Screen" নির্বাচন করুন</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  স্ক্রল করে নিচের দিকে যান এবং
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add to Home Screen
                  </span>
                  অপশনে ট্যাপ করুন।
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                ৩
              </span>
              <div className="flex-1">
                <p className="font-medium text-foreground">"Add" চাপুন</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  উপরে ডানপাশের <span className="font-semibold text-foreground">Add</span> বাটনে ট্যাপ করুন।
                  RamaSub আইকন আপনার হোম স্ক্রিনে যোগ হয়ে যাবে।
                </p>
              </div>
            </li>
          </ol>

          <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
            💡 টিপ: ইনস্টলের পর হোম স্ক্রিনের <strong>RamaSub</strong> আইকনে ট্যাপ করলেই full-screen অ্যাপ চালু হবে — কোনো address bar থাকবে না।
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
