import { Link } from "@tanstack/react-router";
import {
  MessageCircle,
  Mail,
  PhoneCall,
  Package,
  Info,
  FileText,
} from "lucide-react";
import accessNowLogo from "@/assets/logo-gold-a.webp";

type LinkTo =
  | "/"
  | "/products"
  | "/streaming"
  | "/ai-tools"
  | "/education"
  | "/faq"
  | "/contact"
  | "/orders"
  | "/profile"
  | "/login"

  | "/register"
  | "/forgot-password"
  | "/cart"
  | "/checkout"
  | "/privacy-policy"
  | "/terms"
  | "/refund-policy"
  | "/order-cancellation"
  | "/delivery-info"
  | "/refund-request";

const COLUMNS: {
  title: string;
  Icon: typeof Package;
  iconBg: string;
  bullet: string;
  links: { label: string; to: LinkTo }[];
}[] = [
  {
    title: "Products",
    Icon: Package,
    iconBg: "from-primary to-aqua",
    bullet: "bg-fuchsia-600",
    links: [
      { label: "All Products", to: "/products" },
      { label: "Streaming", to: "/streaming" },
      { label: "AI Tools", to: "/ai-tools" },
      { label: "Education", to: "/education" },
      { label: "My Cart", to: "/cart" },
      { label: "Checkout", to: "/checkout" },
    ],
  },
  {
    title: "Information",
    Icon: Info,
    iconBg: "from-primary to-aqua",
    bullet: "bg-fuchsia-600",
    links: [
      { label: "FAQ", to: "/faq" },
      { label: "Contact Us", to: "/contact" },
      { label: "My Account", to: "/profile" },
      { label: "My Orders", to: "/orders" },
      { label: "Sign In", to: "/login" },
      { label: "Create Account", to: "/register" },
      { label: "Forgot Password", to: "/forgot-password" },
    ],
  },
  {
    title: "Policies",
    Icon: FileText,
    iconBg: "from-primary to-aqua",
    bullet: "bg-fuchsia-600",
    links: [
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms & Conditions", to: "/terms" },
      { label: "Refund & Return Policy", to: "/refund-policy" },
      { label: "Order & Cancellation", to: "/order-cancellation" },
      { label: "Delivery Info", to: "/delivery-info" },
      { label: "Refund Request", to: "/refund-request" },
    ],
  },
];

const SOCIALS = [
  { Icon: MessageCircle, href: "https://wa.me/8801580607614", label: "WhatsApp" },
];


const PAYMENTS = ["BKash", "Nagad", "Rocket", "Visa", "Mastercard"];

export function SiteFooter() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-[var(--glass-border-soft)] bg-[linear-gradient(180deg,rgba(7,9,26,0.74),rgba(7,9,26,0.96))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-aqua/55 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-1/2 top-0 h-36 w-[min(760px,85vw)] -translate-x-1/2 rounded-full bg-primary/16 blur-[96px]" />
        <div className="absolute right-[8%] bottom-0 h-60 w-60 rounded-full bg-aqua/8 blur-[90px]" />
        <div className="absolute left-[8%] bottom-8 h-60 w-60 rounded-full bg-gold/7 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-7 pt-10 md:px-10 md:pt-12">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.45fr] lg:items-stretch">
          <section className="relative min-h-[360px] overflow-hidden rounded-[26px] border border-[var(--glass-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025)_48%,rgba(34,211,238,0.035))] p-6 shadow-[var(--shadow-glass)] md:p-8">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-aqua/55 to-transparent" />
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/18 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-aqua/10 blur-[96px]" />

            <div className="relative flex h-full flex-col justify-between gap-8">
              <div>
                <Link
                  to="/"
                  className="inline-flex max-w-full items-center gap-3 sm:gap-4"
                  aria-label="AccessNow BD home"
                >
                  <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--gradient-conic)] p-[2px] shadow-[0_16px_42px_-16px_rgba(34,211,238,0.7)] md:h-[72px] md:w-[72px]">
                    <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[radial-gradient(120%_120%_at_30%_20%,rgba(255,255,255,0.98)_0%,rgba(225,236,255,0.92)_56%,rgba(196,218,255,0.88)_100%)] ring-1 ring-white/35">
                      <span className="pointer-events-none absolute inset-x-2 top-1 h-3 rounded-full bg-white/70 blur-[4px]" />
                      <img
                        src={accessNowLogo}
                        alt="AccessNow BD"
                        draggable={false}
                        className="relative h-[145%] w-[145%] object-contain translate-y-[2%]"
                      />
                    </span>
                  </span>

                  <span className="min-w-0 leading-[1.05]">
                    <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <span
                        className="text-[24px] font-extrabold tracking-normal bg-clip-text text-transparent sm:text-[28px] md:text-[32px]"
                        style={{
                          backgroundImage:
                            "linear-gradient(180deg, #7cb6ff 0%, #2f6dff 55%, #1e3fb8 100%)",
                        }}
                      >
                        Access
                      </span>
                      <span
                        className="text-[24px] font-extrabold tracking-normal bg-clip-text text-transparent sm:text-[28px] md:text-[32px]"
                        style={{
                          backgroundImage:
                            "linear-gradient(180deg, #6ce4b8 0%, #1fc796 55%, #0e9472 100%)",
                        }}
                      >
                        Now
                      </span>
                      <span
                        className="text-[24px] font-extrabold tracking-normal bg-clip-text text-transparent sm:text-[28px] md:text-[32px]"
                        style={{
                          backgroundImage:
                            "linear-gradient(180deg, #ffd86b 0%, #f59e0b 55%, #c2780a 100%)",
                        }}
                      >
                        BD
                      </span>
                    </span>
                    <span className="mt-1.5 flex max-w-[230px] items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70 md:text-[11px]">
                        Fast
                      </span>
                      <span className="h-1 w-1 rounded-full bg-primary shadow-[0_0_6px_rgba(47,109,255,0.8)]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70 md:text-[11px]">
                        Secure
                      </span>
                      <span className="h-1 w-1 rounded-full bg-aqua shadow-[0_0_6px_rgba(31,199,150,0.8)]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70 md:text-[11px]">
                        Reliable
                      </span>
                    </span>
                  </span>
                </Link>

                <p className="mt-6 max-w-xl text-[14px] leading-7 text-white/72">
                  <span className="font-bold text-cyan-600">বাংলাদেশের</span> সবচেয়ে{" "}
                  <span className="font-bold text-fuchsia-700">বিশ্বস্ত ডিজিটাল মার্কেটপ্লেস</span>{" "}
                  — <span className="font-semibold text-emerald-700">ভেরিফাইড সাবস্ক্রিপশন</span>,{" "}
                  <span className="font-semibold text-amber-600">সফটওয়্যার লাইসেন্স</span>,{" "}
                  <span className="font-semibold text-blue-700">AI টুলস</span> ও{" "}
                  <span className="font-bold text-rose-600">24/7 লাইভ সাপোর্টে</span>{" "}
                  আপনার ডিজিটাল প্রয়োজন{" "}
                  <span className="font-bold text-lime-700">এক ক্লিকেই পূরণ</span>।
                </p>
              </div>

              <div className="grid gap-2.5">
                {[
                  { Icon: PhoneCall, label: "+880 1580-607614", href: "tel:+8801580607614" },
                  { Icon: Mail, label: "support@accessnowbd.com", href: "mailto:support@accessnowbd.com" },
                ].map(({ Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="group grid min-h-11 grid-cols-[2rem_1fr] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-50/40"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white shadow-md" style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 truncate text-[13px] font-semibold leading-5 text-slate-800 group-hover:text-indigo-700">
                      {label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div
                key={col.title}
                className="footer-glass-card group/card relative overflow-hidden rounded-[20px] border border-white/15 bg-gradient-to-br from-white/[0.10] via-white/[0.05] to-white/[0.02] p-4 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/30 hover:shadow-[0_20px_48px_-12px_rgba(34,211,238,0.25),inset_0_1px_0_rgba(255,255,255,0.22)] md:min-h-[360px] md:rounded-[24px] md:p-6"
              >
                {/* Glossy top highlight */}
                <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                {/* Diagonal sheen */}
                <span className="pointer-events-none absolute -top-1/2 -left-1/3 h-[200%] w-[40%] rotate-12 bg-gradient-to-r from-transparent via-white/8 to-transparent opacity-60" />
                {/* Soft color glow */}
                <span className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-[60px] opacity-70 transition-opacity duration-300 group-hover/card:opacity-100" />
                <span className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-aqua/12 blur-[70px]" />

                <div className="relative mb-4 flex items-center gap-3 md:mb-5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${col.iconBg} text-white shadow-[0_12px_28px_-16px_rgba(34,211,238,0.75),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-white/20 md:h-10 md:w-10 md:rounded-2xl`}>
                    <col.Icon className="h-4 w-4 md:h-5 md:w-5" />
                  </span>
                  <h4
                    className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/90 md:text-[12px]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {col.title}
                  </h4>
                  <span className="ml-auto h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
                </div>
                <ul className="relative grid grid-cols-2 gap-1.5 md:grid-cols-1 md:gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.to + l.label}>
                      <Link
                        to={l.to}
                        className="group flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-semibold leading-4 text-white/82 transition-all duration-200 hover:border-aqua/35 hover:bg-white/[0.09] hover:text-white md:rounded-xl md:border-transparent md:bg-transparent md:px-2 md:text-[13.5px] md:leading-5 md:hover:border-white/10 md:hover:bg-white/[0.07] md:hover:backdrop-blur-md"
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${col.bullet} opacity-80 shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-opacity duration-200 group-hover:opacity-100`} />
                        <span className="truncate">{l.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-[var(--glass-border-soft)] bg-foreground/[0.04] px-4 py-4 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-4 lg:px-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-start">
            <div className="flex items-center gap-2">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="group relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--glass-border)] bg-foreground/[0.04] text-foreground/80 transition-all duration-300 hover:border-[var(--gold)]/50 hover:bg-foreground/[0.07] hover:text-[var(--gold)] hover:shadow-[0_8px_22px_-12px_rgba(212,175,55,0.55)]"
                >
                  <Icon className="h-[15px] w-[15px] transition-transform duration-300 group-hover:scale-110" />
                </a>
              ))}
            </div>

            <div className="relative inline-flex max-w-full items-center overflow-x-auto rounded-full border border-[var(--glass-border)] bg-gradient-to-r from-primary/[0.08] via-aqua/[0.06] to-[var(--gold)]/[0.08] px-4 py-1.5 shadow-[0_4px_18px_-10px_rgba(79,70,229,0.35)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.18), transparent 60%)" }} />
              <p className="relative whitespace-nowrap text-[12px] md:text-[12.5px] leading-6 tracking-[0.01em]">
                <span className="text-rose-500">©</span>{" "}
                <span className="font-bold text-fuchsia-600 dark:text-fuchsia-400">2026</span>
                <span className="mx-2 text-foreground/25">·</span>
                <span className="font-extrabold tracking-tight text-primary">Access</span><span className="font-extrabold tracking-tight text-aqua-deep">Now</span>{" "}
                <span className="font-extrabold tracking-tight text-[var(--gold)]">BD</span>
                <span className="mx-2 text-foreground/25">·</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">All</span>{" "}
                <span className="font-semibold text-sky-600 dark:text-sky-400">Rights</span>{" "}
                <span className="font-semibold text-violet-600 dark:text-violet-400">Reserved</span>
                <span className="mx-2 text-foreground/25">·</span>
                <span className="italic text-amber-700 dark:text-amber-400">Designed</span>{" "}
                <span className="italic text-foreground/55">&amp;</span>{" "}
                <span className="italic text-teal-600 dark:text-teal-400">Developed</span>{" "}
                <span className="italic text-foreground/55">by</span>{" "}
                <a
                  href="/developer"
                  className="font-extrabold tracking-tight text-violet-600 dark:text-violet-400 underline-offset-4 transition hover:underline hover:text-violet-700 dark:hover:text-violet-300"
                >
                  Shahed IT
                </a>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
            <span className="mr-1 text-[10px] uppercase tracking-[0.22em] text-white/42">
              We accept
            </span>
            {PAYMENTS.map((p) => (
              <span
                key={p}
                className="grid h-7 place-items-center rounded-full border border-[var(--glass-border-soft)] bg-white/[0.04] px-3 text-[11px] font-bold text-white/78"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
