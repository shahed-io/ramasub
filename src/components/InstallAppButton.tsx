import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  Download,
  Share,
  Plus,
  ChevronUp,
  ChevronDown,
  Smartphone,
  Tablet,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios-iphone" | "ios-ipad" | "android" | "desktop" | "unknown";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const isIpad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" &&
      (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  if (isIpad) return "ios-ipad";
  if (/iPhone|iPod/.test(ua)) return "ios-iphone";
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return "desktop";
  return "unknown";
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\//i.test(navigator.userAgent);
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

interface InstallAppButtonProps {
  variant?: "default" | "compact" | "ghost";
  className?: string;
}

export function InstallAppButton({ variant = "default", className = "" }: InstallAppButtonProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setDeferred(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!mounted) return null;
  if (installed) return null;

  const handleClick = async () => {
    // Native prompt available (Android Chrome / Edge / Desktop Chromium)
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") {
          setDeferred(null);
          return;
        }
      } catch {
        /* fall through to guide */
      }
    }
    // Otherwise show contextual guide
    setOpen(true);
  };

  const label =
    platform === "ios-iphone" || platform === "ios-ipad"
      ? "Add to Home Screen"
      : "Install App";

  const baseBtn =
    variant === "compact"
      ? "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold"
      : variant === "ghost"
        ? "inline-flex items-center gap-2 h-10 px-3 rounded-lg text-sm font-medium hover:bg-muted"
        : "inline-flex items-center gap-2 h-11 px-4 rounded-full text-sm font-semibold shadow-md";

  const baseColor =
    variant === "ghost"
      ? "text-foreground"
      : "text-white bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`${baseBtn} ${baseColor} transition ${className}`}
        aria-label={label}
      >
        <Download className="h-4 w-4" />
        <span>{label}</span>
      </button>

      <InstallGuideDialog
        open={open}
        onOpenChange={setOpen}
        platform={platform}
        pageName={pageLabel(pathname)}
      />
    </>
  );
}

function InstallGuideDialog({
  open,
  onOpenChange,
  platform,
  pageName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  platform: Platform;
  pageName: string;
}) {
  const iosSafari = platform.startsWith("ios") ? isIosSafari() : true;

  let DeviceIcon = Monitor;
  let deviceName = "ডিভাইস";
  let steps: { title: string; body: React.ReactNode }[] = [];
  let warning: React.ReactNode = null;

  if (platform === "ios-iphone" || platform === "ios-ipad") {
    const isIpad = platform === "ios-ipad";
    DeviceIcon = isIpad ? Tablet : Smartphone;
    deviceName = isIpad ? "iPad" : "iPhone";
    const shareLoc = isIpad ? "উপরে ডানপাশে" : "নিচে মাঝখানে";
    const Dir = isIpad ? ChevronUp : ChevronDown;
    if (!iosSafari) {
      warning = (
        <>
          ইনস্টল করতে অবশ্যই <strong>Safari</strong> ব্রাউজার ব্যবহার করুন। Chrome / Facebook / Instagram-এর in-app browser থেকে এটি কাজ করবে না।
        </>
      );
    }
    steps = [
      {
        title: "Share বাটনে ট্যাপ করুন",
        body: (
          <span className="flex flex-wrap items-center gap-1.5">
            Safari-এর <span className="font-semibold text-foreground">{shareLoc}</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
              <Share className="h-3.5 w-3.5" />
              Share
            </span>
            <Dir className="h-4 w-4 text-primary" /> আইকনে ট্যাপ করুন।
          </span>
        ),
      },
      {
        title: '"Add to Home Screen" নির্বাচন করুন',
        body: (
          <span className="flex flex-wrap items-center gap-1.5">
            স্ক্রল করে
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
              <Plus className="h-3.5 w-3.5" />
              Add to Home Screen
            </span>
            অপশনে ট্যাপ করুন।
          </span>
        ),
      },
      {
        title: '"Add" চাপুন',
        body: <>উপরে ডানপাশের <strong>Add</strong> বাটনে ট্যাপ করুন। RamaSub আইকন হোম স্ক্রিনে যোগ হবে।</>,
      },
    ];
  } else if (platform === "android") {
    DeviceIcon = Smartphone;
    deviceName = "Android";
    steps = [
      {
        title: "Chrome মেনু খুলুন",
        body: (
          <span className="flex flex-wrap items-center gap-1.5">
            উপরে ডানপাশের
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
              <MoreVertical className="h-3.5 w-3.5" />
              মেনু (3-dot)
            </span>
            আইকনে ট্যাপ করুন।
          </span>
        ),
      },
      {
        title: '"Install app" বা "Add to Home screen" বেছে নিন',
        body: <>মেনু থেকে <strong>Install app</strong> অথবা <strong>Add to Home screen</strong> অপশন বাছাই করুন।</>,
      },
      {
        title: "নিশ্চিত করুন",
        body: <><strong>Install</strong> চাপুন — RamaSub অ্যাপ হোম স্ক্রিনে এবং app drawer-এ যোগ হবে।</>,
      },
    ];
  } else {
    DeviceIcon = Monitor;
    deviceName = "কম্পিউটার / ল্যাপটপ";
    steps = [
      {
        title: "Address bar-এ Install আইকন খুঁজুন",
        body: (
          <span className="flex flex-wrap items-center gap-1.5">
            Chrome / Edge-এর address bar-এর ডানপাশে
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
              <Download className="h-3.5 w-3.5" />
              Install
            </span>
            আইকনে ক্লিক করুন।
          </span>
        ),
      },
      {
        title: "অথবা মেনু থেকে",
        body: (
          <span className="flex flex-wrap items-center gap-1.5">
            উপরে ডানপাশের
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
              <MoreVertical className="h-3.5 w-3.5" /> মেনু
            </span>
            → <strong>Install RamaSub…</strong> বাছাই করুন।
          </span>
        ),
      },
      {
        title: "Install চাপুন",
        body: <>একটি standalone window-তে RamaSub চালু হবে এবং Desktop / Start menu-তে shortcut বসবে।</>,
      },
    ];
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DeviceIcon className="h-5 w-5 text-primary" />
            {deviceName}-এ RamaSub ইনস্টল করুন
          </DialogTitle>
          <DialogDescription>
            আপনি এখন <span className="font-semibold text-foreground">{pageName}</span>-এ আছেন।
            ইনস্টলের পর native app-এর মতো full-screen-এ চলবে।
          </DialogDescription>
        </DialogHeader>

        {warning && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        <ol className="space-y-3 text-sm">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>ইনস্টলের পর হোম স্ক্রিন / Desktop-এর <strong>RamaSub</strong> আইকনে ক্লিক করলেই অ্যাপ চালু হবে।</span>
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>বুঝেছি</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
