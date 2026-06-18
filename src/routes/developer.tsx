import { createFileRoute } from "@tanstack/react-router";
import {
  Globe,
  Code2,
  Palette,
  Megaphone,
  ShieldCheck,
  Clock,
  Users,
  Award,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Rocket,
  ShieldAlert,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/developer")({
  component: DeveloperPage,
  head: () => ({
    meta: [
      { title: "Developer — Shahed IT | AccessNow BD" },
      {
        name: "description",
        content:
          "AccessNow BD is designed and developed by Shahed IT — a trusted Bangladeshi digital agency since 2014, offering web development, graphic design and digital marketing.",
      },
      { property: "og:title", content: "Meet the Developer — Shahed IT" },
      {
        property: "og:description",
        content:
          "The team behind AccessNow BD: Shahed IT, a premium Bangladeshi IT agency with 10+ years of experience and 1000+ projects delivered.",
      },
    ],
  }),
});

const STATS = [
  { icon: Users, label: "সন্তুষ্ট গ্রাহক", value: "500+" },
  { icon: Award, label: "সম্পন্ন প্রজেক্ট", value: "1000+" },
  { icon: Clock, label: "বছরের অভিজ্ঞতা", value: "10+" },
  { icon: Globe, label: "দেশে সার্ভিস", value: "20+" },
];

const SERVICES = [
  {
    icon: Code2,
    title: "Web Development",
    desc: "Business website, e-commerce, WordPress এবং কাস্টম ওয়েব অ্যাপ্লিকেশন — যা দ্রুত, নিরাপদ ও SEO-ফ্রেন্ডলি।",
  },
  {
    icon: Palette,
    title: "Graphics Design",
    desc: "Logo, branding, social media creatives এবং video editing — আপনার ব্র্যান্ডকে professional look দেয়।",
  },
  {
    icon: Megaphone,
    title: "Digital Marketing",
    desc: "Facebook Ads, Google Ads, SEO ও content marketing — যা আপনার ব্যবসাকে এগিয়ে নিয়ে যায়।",
  },
  {
    icon: ShieldCheck,
    title: "Website Maintenance",
    desc: "Speed optimization, security এবং regular backup — আপনার সাইট সবসময় চালু ও নিরাপদ থাকবে।",
  },
];

const VALUES = [
  "100% স্বচ্ছ লেনদেন নিশ্চিত করা হয়",
  "দ্রুত ও সময়মতো ডেলিভারি",
  "গ্রাহক সন্তুষ্টি সর্বোচ্চ অগ্রাধিকার",
  "নিরাপদ ও নির্ভরযোগ্য সার্ভিস প্রদান",
  "সাশ্রয়ী মূল্যে মানসম্পন্ন ডিজিটাল সেবা",
  "24/7 গ্রাহক সহায়তা ও সাপোর্ট",
];

function DeveloperPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
        <article>
          {/* Hero badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            Developer Spotlight
          </div>

          <h1 className="text-3xl font-extrabold leading-tight md:text-5xl text-foreground">
            এই ওয়েবসাইটটি ডিজাইন ও ডেভেলপ করেছে{" "}
            <span className="inline-block bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent [-webkit-text-fill-color:transparent]">
              Shahed IT
            </span>
          </h1>

          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            প্রকাশিত: 2026 • লেখক: AccessNow BD Team • পড়ার সময়: ~4 মিনিট
          </p>

          {/* Intro card */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-violet-500/10 dark:backdrop-blur">
            <p className="text-base leading-relaxed text-foreground/90 md:text-lg">
              <strong>AccessNow BD</strong> ওয়েবসাইটটির সম্পূর্ণ ডিজাইন,
              ডেভেলপমেন্ট ও রক্ষণাবেক্ষণের দায়িত্বে রয়েছে{" "}
              <strong className="text-violet-600 dark:text-violet-300">
                Shahed IT
              </strong>{" "}
              — বাংলাদেশের একটি বিশ্বস্ত প্রিমিয়াম আইটি এজেন্সি, যারা 2014 সাল
              থেকে দেশি-বিদেশি গ্রাহকদের জন্য উচ্চমানের ডিজিটাল সল্যুশন তৈরি
              করে আসছে।
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-5 md:p-6 dark:border-amber-500/30 dark:bg-amber-500/[0.06]">
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                দায়িত্ব বিবৃতি / Disclaimer
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-amber-950 md:text-base dark:text-amber-50/90">
              <strong>Shahed IT</strong> শুধুমাত্র এই ওয়েবসাইটটি প্রিমিয়ামভাবে
              ডিজাইন ও ডেভেলপ করছে। ডেভেলপার কোম্পানির সাথে ওয়েবসাইটের
              মালিক/প্রতিষ্ঠানের কোনো স্বত্ব, অংশীদারিত্ব বা ব্যবসায়িক সম্পর্ক
              নেই। সম্পূর্ণ মালিকানা, ব্যবস্থাপনা, পণ্য/সার্ভিস, লেনদেন এবং
              আইনি দায়িত্ব ওয়েবসাইটের প্রকৃত মালিক/প্রতিষ্ঠানের। ভবিষ্যতে
              ওয়েবসাইট থেকে যেকোনো ধরনের সমস্যা, অভিযোগ বা আইনি বিষয়ের জন্য
              ডেভেলপার কোম্পানি (<strong>Shahed IT</strong>) দায়ী থাকবে না।
            </p>
          </div>


          {/* Stats */}
          <section className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-violet-400 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-violet-400/50 dark:hover:shadow-violet-500/10 dark:backdrop-blur"
              >
                <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 text-violet-600 dark:text-violet-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-violet-300 dark:to-fuchsia-300">
                  {value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
          </section>

          {/* Who they are */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold md:text-3xl text-foreground">
              Shahed IT — কারা তারা?
            </h2>
            <p className="mt-4 leading-relaxed text-foreground/85">
              Shahed IT একটি বিশ্বস্ত ডিজিটাল সার্ভিস প্রদানকারী প্রতিষ্ঠান।
              তারা বিভিন্ন ধরনের আইটি সেবা, ডিজিটাল সাবস্ক্রিপশন, সফটওয়্যার
              সল্যুশন এবং অনলাইন সার্ভিস প্রদান করে। তাদের লক্ষ্য হলো গ্রাহকদের
              নিরাপদ, দ্রুত এবং সাশ্রয়ী মূল্যে ডিজিটাল সেবা প্রদান করা — এবং
              AccessNow BD সেই দর্শনেরই বাস্তব রূপ।
            </p>
            <p className="mt-4 leading-relaxed text-foreground/85">
              10 বছরের অধিক অভিজ্ঞতা, 1000+ সফল প্রজেক্ট এবং 20+ দেশে সেবা
              প্রদানের ট্র্যাক রেকর্ড নিয়ে Shahed IT দাঁড়িয়ে আছে বাংলাদেশের
              অগ্রণী আইটি এজেন্সিগুলোর কাতারে।
            </p>
          </section>

          {/* Services */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold md:text-3xl text-foreground">তাদের সেবাসমূহ</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {SERVICES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-400 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-violet-400/50 dark:hover:shadow-violet-500/10 dark:backdrop-blur"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Values */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold md:text-3xl text-foreground">কেন Shahed IT?</h2>
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {VALUES.map((v) => (
                <li
                  key={v}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-400 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-violet-400/50 dark:backdrop-blur"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-500 dark:text-violet-400" />
                  <span className="text-sm leading-relaxed text-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Project story */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold md:text-3xl">
              AccessNow BD প্রজেক্ট সম্পর্কে
            </h2>
            <p className="mt-4 leading-relaxed text-foreground/85">
              AccessNow BD একটি আধুনিক ডিজিটাল সাবস্ক্রিপশন ও সার্ভিস
              প্ল্যাটফর্ম, যেখানে গ্রাহকরা সহজে premium subscriptions, software
              এবং digital products কিনতে পারেন। এই প্ল্যাটফর্মের পুরো UI/UX,
              frontend, backend, payment integration এবং admin panel — সবকিছুই
              Shahed IT টিমের নিজস্ব নকশা ও কোডিংয়ে তৈরি।
            </p>
            <p className="mt-4 leading-relaxed text-foreground/85">
              মোবাইল-ফার্স্ট রেসপনসিভ ডিজাইন, দ্রুত লোডিং, নিরাপদ পেমেন্ট ফ্লো
              এবং 24/7 সাপোর্ট সিস্টেম — প্রতিটি ফিচারই গ্রাহকের অভিজ্ঞতাকে
              সর্বোচ্চ গুরুত্ব দিয়ে তৈরি করা হয়েছে।
            </p>
          </section>

          {/* CTA — solid panel, no diagonal sheen so the text stays fully legible */}
          <section className="mt-12 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 text-white shadow-lg shadow-black/30 md:p-8">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold md:text-2xl">
                আপনারও কি একটি ওয়েবসাইট দরকার?
              </h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/90 md:text-base">
              আপনার ব্যবসার জন্য একটি প্রিমিয়াম ওয়েবসাইট, ই-কমার্স স্টোর কিংবা
              কাস্টম সফটওয়্যার সল্যুশন তৈরি করতে চাইলে আজই Shahed IT-এর সাথে
              যোগাযোগ করুন।
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {/* Visit button — premium rotating gradient border, infinite animation */}
              <span className="relative inline-flex rounded-full p-[2px] overflow-hidden shadow-lg shadow-violet-500/30">
                <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#7c3aed,#ec4899,#06b6d4,#7c3aed)] animate-[spinSlow_3s_linear_infinite] z-0" />
                <a
                  href="https://shahedit.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all duration-300 hover:scale-105 hover:bg-slate-50"
                >
                  Visit Shahed IT
                  <ExternalLink className="h-4 w-4" />
                </a>
              </span>
              <a
                href="https://shahedit.com/get-quote"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-all duration-300 hover:bg-white/20 hover:border-white/60 hover:scale-105"
              >
                Get a Quote
              </a>
            </div>
          </section>

          <p className="mt-12 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} AccessNow BD · Crafted with care by
            Shahed IT
          </p>
        </article>
      </div>
      <SiteFooter />
    </div>
  );
}
