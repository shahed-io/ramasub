import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Minus, MessageCircle } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions — AccessNow BD" },
      { name: "description", content: "Answers to common questions about delivery, payment, warranty and account support at AccessNow BD." },
      { property: "og:title", content: "FAQ — AccessNow BD" },
      { property: "og:description", content: "Everything you need to know about buying premium subscriptions in Bangladesh." },
      { property: "og:url", content: "https://accessnowbd.com/faq" },
    ],
    links: [{ rel: "canonical", href: "https://accessnowbd.com/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: SECTIONS.flatMap((s) =>
            s.items.map((i) => ({
              "@type": "Question",
              name: i.q,
              acceptedAnswer: { "@type": "Answer", text: i.a },
            })),
          ),
        }),
      },
    ],
  }),
});

const SECTIONS = [
  {
    title: "Orders & Delivery",
    items: [
      { q: "অর্ডারের পর কতক্ষণে অ্যাকাউন্ট পাব?", a: "সাধারণত 10–30 মিনিট, অফিস আওয়ারে আরও দ্রুত। অফিস বন্ধ থাকলে সর্বোচ্চ 3 ঘণ্টার মধ্যে।" },
      { q: "অর্ডার ট্র্যাক করব কীভাবে?", a: "সাইন ইন করার পর \"My Orders\" পেজে গেলে স্ট্যাটাস ও ডিটেইল দেখতে পারবেন।" },
      { q: "অর্ডার ক্যান্সেল করতে চাই", a: "ডেলিভারি না হওয়া পর্যন্ত WhatsApp-এ মেসেজ দিলে ক্যান্সেল করা যাবে।" },
    ],
  },
  {
    title: "Payment",
    items: [
      { q: "কী কী পেমেন্ট মেথড সাপোর্ট করেন?", a: "BKash, Nagad, Rocket, Upay এবং সব ভিসা / মাস্টারকার্ড / অ্যামেক্স কার্ড।" },
      { q: "Cash on delivery কি আছে?", a: "ডিজিটাল প্রোডাক্ট হওয়ায় আমরা cash on delivery অফার করি না, কিন্তু মোবাইল ব্যাংকিং খুবই সহজ।" },
      { q: "ইনভয়েস বা রিসিট কি পাব?", a: "অর্ডারের পরে অটোমেটিক ইনভয়েস ইমেইলে যাবে।" },
    ],
  },
  {
    title: "Warranty & Support",
    items: [
      { q: "অ্যাকাউন্ট কাজ না করলে কি হবে?", a: "30 দিনের ফুল ওয়ারেন্টি — রিপ্লেসমেন্ট অথবা টাকা ফেরত। কোনো প্রশ্ন ছাড়াই।" },
      { q: "পাসওয়ার্ড পরিবর্তন করতে পারব?", a: "শেয়ার্ড অ্যাকাউন্টে পাসওয়ার্ড পরিবর্তন করা যাবে না; প্রাইভেট অ্যাকাউন্টে অবশ্যই পরিবর্তন করতে হবে।" },
      { q: "Support টাইমিং কখন?", a: "প্রতিদিন 11 AM – 11 PM, WhatsApp-এ 24/7 চেষ্টা করি।" },
    ],
  },
  {
    title: "Subscriptions",
    items: [
      { q: "একই অ্যাকাউন্ট কতজন ব্যবহার করতে পারব?", a: "প্রোডাক্ট অনুযায়ী আলাদা — প্রোডাক্ট পেজে \"Features\" সেকশনে স্পষ্টভাবে লেখা আছে।" },
      { q: "Education / Bundle ডিসকাউন্ট কীভাবে পাব?", a: "একসাথে দু'টি বা তার বেশি প্রোডাক্ট কার্টে যোগ করলে চেকআউটে অটো-ডিসকাউন্ট অ্যাপ্লাই হবে।" },
      { q: "পরে রিনিউ করতে পারব?", a: "অবশ্যই। মেয়াদ শেষ হওয়ার আগে আমরা রিমাইন্ডার পাঠাই।" },
    ],
  },
];

function FaqPage() {
  return (
    <div className="min-h-screen">

      <section className="relative bg-[#07071a] text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-primary/35 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-[var(--color-aqua)]/35 blur-[140px]" />
        <div className="relative mx-auto max-w-[1440px] px-4 md:px-10 py-14 md:py-20 text-center">
          <span className="inline-flex px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold mb-3">FAQ</span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 4.5vw, 48px)", fontWeight: 800 }}>
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-white/75 max-w-2xl mx-auto">Everything you need to know — delivery, payment, warranty, support।</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-4 md:px-10 py-12 space-y-10">
        {SECTIONS.map((sec) => <FaqGroup key={sec.title} title={sec.title} items={sec.items} />)}

        <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card p-8 md:p-12 shadow-[0_20px_60px_-25px_rgba(79,70,229,0.35)]">
          {/* Decorative left rail */}
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary via-fuchsia-500 to-emerald-500" />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-primary/10 text-primary shrink-0">
              <MessageCircle className="w-7 h-7" />
            </div>

            <div className="flex-1 text-left">
              <span className="inline-flex px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-bold tracking-wide uppercase mb-2">
                ● Live support
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
                আরও প্রশ্ন আছে?
              </h2>
              <p className="mt-1.5 text-sm md:text-base text-muted-foreground">
                WhatsApp-এ মেসেজ দিন — আমরা সবসময় হাজির।
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <a
                href="https://wa.me/8801580607614"
                className="h-11 px-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white text-sm font-bold shadow-lg shadow-emerald-500/25 hover:scale-[1.03] transition"
              >
                <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
              </a>
              <Link
                to="/contact"
                className="h-11 px-5 inline-flex items-center rounded-full border border-primary/25 bg-background text-primary text-sm font-bold hover:bg-primary/5 transition"
              >
                Send a message
              </Link>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function FaqGroup({ title, items }: { title: string; items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-4 tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <button key={i} onClick={() => setOpen(isOpen ? null : i)}
              className={`w-full text-left glass-strong rounded-2xl px-5 py-4 transition ${isOpen ? "ring-2 ring-primary/30" : ""}`}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm md:text-base font-bold">{it.q}</span>
                <span className="grid place-items-center w-7 h-7 rounded-full bg-aurora text-white shrink-0">
                  {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </span>
              </div>
              {isOpen && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{it.a}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
