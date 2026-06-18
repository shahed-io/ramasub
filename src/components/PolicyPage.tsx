import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import {
  ShieldCheck,
  FileText,
  RefreshCcw,
  XCircle,
  Truck,
  Wallet,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const POLICY_LINKS = [
  { to: "/privacy-policy", label: "Privacy Policy", bn: "প্রাইভেসি পলিসি", icon: ShieldCheck },
  { to: "/terms", label: "Terms & Conditions", bn: "টার্মস ও কন্ডিশনস", icon: FileText },
  { to: "/refund-policy", label: "Refund & Return Policy", bn: "রিফান্ড পলিসি", icon: RefreshCcw },
  { to: "/order-cancellation", label: "Order & Cancellation", bn: "অর্ডার ক্যান্সেলেশন", icon: XCircle },
  { to: "/delivery-info", label: "Delivery Info", bn: "ডেলিভারি ইনফো", icon: Truck },
  { to: "/refund-request", label: "Refund Request", bn: "রিফান্ড রিকোয়েস্ট", icon: Wallet },
] as const;

export function PolicyPage({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const { pathname } = useLocation();

  return (
    <div className="dark-adapt min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      {/* soft ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="mx-auto h-[420px] max-w-6xl bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.10),transparent_60%),radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.08),transparent_55%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        {/* Header */}
        <header className="mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow ?? "AccessNow BD · Policies"}
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-[linear-gradient(135deg,#6D28D9_0%,#4F46E5_50%,#0891B2_100%)]">
              {title}
            </span>
          </h1>
          {subtitle ? (
            <p className="mt-4 max-w-2xl text-[15px] md:text-base leading-7 text-slate-600">
              {subtitle}
            </p>
          ) : null}
        </header>

        <div className="grid gap-8 md:grid-cols-[280px_1fr]">
          {/* Sidebar nav */}
          <aside className="md:sticky md:top-24 self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_40px_-20px_rgba(79,70,229,0.25)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[linear-gradient(135deg,#7C3AED,#0891B2)] text-white shadow-md">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-700">
                  Policies
                </span>
              </div>
              <ul className="space-y-1.5">
                {POLICY_LINKS.map((l) => {
                  const Icon = l.icon;
                  const active = pathname === l.to;
                  return (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? "border-violet-300 bg-[linear-gradient(135deg,rgba(124,58,237,0.08),rgba(8,145,178,0.06))] text-violet-800 shadow-sm"
                            : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-md ${
                            active
                              ? "bg-white text-violet-700 shadow-sm"
                              : "bg-slate-100 text-slate-600 group-hover:bg-white group-hover:text-violet-700"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1">{l.label}</span>
                        <ArrowRight
                          className={`h-3.5 w-3.5 transition ${
                            active
                              ? "translate-x-0 text-violet-600 opacity-100"
                              : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
                          }`}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 rounded-xl border border-violet-100 bg-[linear-gradient(135deg,rgba(124,58,237,0.06),rgba(236,72,153,0.05))] p-4">
                <p className="text-xs font-semibold text-violet-800">২৪/৭ সাপোর্ট</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  যেকোনো প্রশ্নে WhatsApp-এ মেসেজ করুন।
                </p>
                <a
                  href="https://wa.me/8801580607614"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  WhatsApp: 01580-607614
                </a>
              </div>
            </div>
          </aside>

          {/* Content */}
          <article
            className="
              relative rounded-3xl border border-slate-200 bg-white p-6 md:p-10
              shadow-[0_20px_60px_-30px_rgba(79,70,229,0.25)]
              text-[15.5px] leading-8 text-slate-700
              [&_h2]:text-xl [&_h2]:md:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900
              [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:first:mt-0
              [&_h2]:flex [&_h2]:items-center [&_h2]:gap-3
              [&_h2:before]:content-[''] [&_h2:before]:inline-block [&_h2:before]:h-5 [&_h2:before]:w-1.5
              [&_h2:before]:rounded-full [&_h2:before]:bg-[linear-gradient(180deg,#7C3AED,#0891B2)]
              [&_p]:text-slate-700
              [&_ul]:list-none [&_ul]:pl-0 [&_ul]:space-y-2.5 [&_ul]:my-3
              [&_li]:relative [&_li]:pl-7
              [&_li:before]:content-[''] [&_li:before]:absolute [&_li:before]:left-1 [&_li:before]:top-[0.7em]
              [&_li:before]:h-2 [&_li:before]:w-2 [&_li:before]:rounded-full
              [&_li:before]:bg-[linear-gradient(135deg,#7C3AED,#EC4899)]
              [&_a]:font-semibold [&_a]:text-violet-700 [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-violet-300
              [&_a:hover]:text-violet-900
              [&_strong]:text-slate-900
            "
          >
            <div
              aria-hidden
              className="absolute -top-px left-8 right-8 h-px bg-[linear-gradient(90deg,transparent,rgba(124,58,237,0.5),rgba(8,145,178,0.5),transparent)]"
            />
            {children}
          </article>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
