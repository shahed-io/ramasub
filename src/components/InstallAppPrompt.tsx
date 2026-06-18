import { useEffect, useState } from "react";
import { Download, Share, X, Plus } from "lucide-react";
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

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    // Respect recent dismissal
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const recently = Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;

    const ios = isIos();
    setIsIosDevice(ios);

    if (ios) {
      // iOS does not fire beforeinstallprompt — show manual instructions button
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              AccessNow BD অ্যাপ ইনস্টল করুন
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              হোম স্ক্রিনে যোগ করে দ্রুত অ্যাকসেস নিন।
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleInstall}>
                ইনস্টল করুন
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                পরে
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>iPhone / iPad এ ইনস্টল করুন</DialogTitle>
            <DialogDescription>
              Safari ব্রাউজার থেকে নিচের ধাপগুলো অনুসরণ করুন:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-semibold">১.</span>
              <span className="flex items-center gap-1">
                নিচের <Share className="inline h-4 w-4" /> Share বাটনে ট্যাপ করুন
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">২.</span>
              <span className="flex items-center gap-1">
                <Plus className="inline h-4 w-4" /> "Add to Home Screen" নির্বাচন করুন
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">৩.</span>
              <span>"Add" চাপুন — অ্যাপটি হোম স্ক্রিনে যুক্ত হবে।</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
