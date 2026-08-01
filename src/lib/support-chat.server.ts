// Server-only helpers for the AI support assistant.
// Builds a LIVE knowledge context (real products, real prices, real coupons,
// real payment methods) so the assistant never invents prices or promo codes.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ChatMsg = { role: "user" | "assistant"; content: string };

function serverClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Plan = { label?: string; duration?: string; price?: number; original_price?: number };
type ProductRow = {
  slug: string;
  name: string;
  category: string;
  stock_status: string;
  short_description: string;
  delivery_time: string;
  warranty: string;
  plans: Plan[] | null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; text: string } | null = null;

function formatPlans(plans: Plan[] | null): string {
  if (!Array.isArray(plans) || plans.length === 0) return "দাম জানার জন্য WhatsApp করুন";
  return plans
    .slice(0, 6)
    .map((p) => {
      const label = (p.label || p.duration || "").toString().trim() || "প্ল্যান";
      const price = typeof p.price === "number" ? `৳${p.price}` : "—";
      const was =
        typeof p.original_price === "number" && p.original_price > (p.price ?? 0)
          ? ` (আগে ৳${p.original_price})`
          : "";
      return `${label}: ${price}${was}`;
    })
    .join(" | ");
}

/** Live catalogue + shop settings, cached for 5 minutes. */
export async function buildLiveContext(): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.text;

  const sb = serverClient();
  const [productsRes, configRes, methodsRes] = await Promise.all([
    sb
      .from("products")
      .select(
        "slug,name,category,stock_status,short_description,delivery_time,warranty,plans",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(60),
    sb
      .from("admin_records")
      .select("data")
      .eq("kind", "shop_config")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    sb
      .from("admin_records")
      .select("data")
      .eq("kind", "payment_method")
      .eq("is_active", true)
      .limit(20),
  ]);

  const products = (productsRes.data ?? []) as unknown as ProductRow[];
  const lines: string[] = [];

  if (products.length) {
    lines.push("🗂️ লাইভ প্রোডাক্ট ক্যাটালগ (এই দামগুলোই সঠিক — নিজে কোনো দাম বানাবে না):");
    for (const p of products) {
      const stock = p.stock_status === "in_stock" ? "স্টকে আছে" : "স্টক আউট";
      lines.push(
        `- ${p.name} [${p.category}] — ${formatPlans(p.plans)} — ${stock} — লিংক: /product/${p.slug}`,
      );
    }
  }

  const cfg = (configRes.data?.data ?? {}) as Record<string, unknown>;
  const cfgBits: string[] = [];
  for (const [key, label] of [
    ["support_hours", "সাপোর্ট সময়"],
    ["whatsapp_number", "WhatsApp"],
    ["support_email", "Email"],
    ["delivery_time", "ডেলিভারি সময়"],
  ] as const) {
    const v = cfg[key];
    if (typeof v === "string" && v.trim()) cfgBits.push(`${label}: ${v.trim()}`);
  }
  if (cfgBits.length) lines.push(`\n🏪 শপ সেটিংস: ${cfgBits.join(" · ")}`);

  const methods = (methodsRes.data ?? [])
    .map((r) => (r.data as Record<string, unknown> | null)?.name)
    .filter((n): n is string => typeof n === "string" && n.trim().length > 0);
  if (methods.length) {
    lines.push(`💳 চালু পেমেন্ট মেথড: ${methods.join(", ")}`);
  }

  const text = lines.join("\n");
  cache = { at: Date.now(), text };
  return text;
}

/**
 * If the visitor mentioned something that looks like a coupon code, look it up
 * for real so the assistant can confirm or reject it instead of guessing.
 * Codes are never listed proactively — only the ones the visitor typed.
 */
export async function lookupMentionedCoupons(lastUserMessage: string): Promise<string> {
  const candidates = Array.from(
    new Set(
      (lastUserMessage.toUpperCase().match(/\b[A-Z][A-Z0-9]{3,19}\b/g) ?? []).slice(0, 4),
    ),
  );
  if (candidates.length === 0) return "";

  const sb = serverClient();
  const { data } = await sb
    .from("coupons")
    .select("code,type,value,min_subtotal,max_discount,is_active,starts_at,ends_at,usage_limit,used_count")
    .in("code", candidates)
    .limit(4);

  const found = data ?? [];
  const notes: string[] = [];

  for (const code of candidates) {
    const c = found.find((f) => f.code === code);
    if (!c) {
      // Only report a miss for codes that really look like promo codes.
      if (/\d/.test(code) || code.length >= 6) {
        notes.push(`- "${code}" নামে কোনো কুপন আমাদের সিস্টেমে নেই।`);
      }
      continue;
    }
    const now = Date.now();
    const expired = c.ends_at ? new Date(c.ends_at).getTime() < now : false;
    const notStarted = c.starts_at ? new Date(c.starts_at).getTime() > now : false;
    const exhausted =
      typeof c.usage_limit === "number" && c.usage_limit > 0
        ? (c.used_count ?? 0) >= c.usage_limit
        : false;
    const usable = c.is_active && !expired && !notStarted && !exhausted;
    const discount =
      c.type === "percent" ? `${c.value}% ছাড়` : `৳${c.value} ছাড়`;
    const min = c.min_subtotal ? ` (সর্বনিম্ন অর্ডার ৳${c.min_subtotal})` : "";
    const cap =
      typeof c.max_discount === "number" && c.max_discount > 0
        ? ` (সর্বোচ্চ ছাড় ৳${c.max_discount})`
        : "";
    notes.push(
      usable
        ? `- "${c.code}" এখন সক্রিয়: ${discount}${min}${cap} — চেকআউট পেজে কোড বসিয়ে Apply চাপলেই প্রযোজ্য হবে।`
        : `- "${c.code}" এখন ব্যবহারযোগ্য নয় (${expired ? "মেয়াদ শেষ" : notStarted ? "এখনো শুরু হয়নি" : exhausted ? "লিমিট শেষ" : "নিষ্ক্রিয়"})।`,
    );
  }

  return notes.length ? `\n🎟️ কুপন যাচাই (বাস্তব ডেটা):\n${notes.join("\n")}` : "";
}

export const BASE_SYSTEM_PROMPT = `তুমি Rama Sub-এর প্রিমিয়াম AI সাপোর্ট অ্যাসিস্ট্যান্ট। ওয়েবসাইট: ramasub.com

ভূমিকা: গ্রাহককে প্রোডাক্ট বাছতে, দাম জানাতে, অর্ডার ও পেমেন্ট প্রসেস বুঝতে এবং সমস্যা সমাধানে সাহায্য করা।

🗣️ ভাষা ও টোন:
- ডিফল্ট বাংলা (প্রয়োজনে English/Banglish mix)। গ্রাহক English-এ লিখলে English-এ উত্তর দাও।
- বন্ধুসুলভ, ভদ্র, আত্মবিশ্বাসী। ২–৫ লাইনের সংক্ষিপ্ত উত্তর।
- হালকা emoji ব্যবহার করো, অতিরিক্ত নয়।
- গুরুত্বপূর্ণ অংশ **bold** করো, একাধিক আইটেম হলে ছোট bullet list দাও (Markdown সাপোর্টেড)।

⚡ সার্ভিস বৈশিষ্ট্য:
- অর্ডার কনফার্ম হওয়ার ৫–৩০ মিনিটের মধ্যে ডেলিভারি (ইমেইল/WhatsApp-এ)
- ১০০% ভেরিফাইড অ্যাকাউন্ট + ফুল ওয়ারেন্টি (সমস্যা হলে রিপ্লেস/রিফান্ড)
- ২৪/৭ সাপোর্ট

🔗 দরকারি লিংক (উত্তরে relative লিংক দাও, যেমন /products):
- সব প্রোডাক্ট: /products · ক্যাটাগরি: /categories · কার্ট: /cart · চেকআউট: /checkout
- আমার অর্ডার: /orders · ওয়ালেট: /wallet · প্রোফাইল: /profile
- হেল্প: /help · FAQ: /faq · ডেলিভারি তথ্য: /delivery-info
- রিফান্ড: /refund-request · রিফান্ড পলিসি: /refund-policy · যোগাযোগ: /contact

🛒 অর্ডার করার ধাপ (কেউ জিজ্ঞাসা করলে এভাবে বলো):
1. প্রোডাক্ট পেজ থেকে প্ল্যান সিলেক্ট করে **Add to Cart**
2. /checkout-এ নাম, ইমেইল, WhatsApp নম্বর দিন
3. পেমেন্ট করে ট্রানজেকশন আইডি/স্ক্রিনশট সাবমিট করুন
4. কনফার্ম হলে ৫–৩০ মিনিটে অ্যাকাউন্ট ডেলিভারি

📞 হিউম্যান সাপোর্ট: WhatsApp +880 1601-048085 · support@ramasub.com

কঠোর নিয়ম:
- দাম, প্ল্যান বা স্টকের তথ্য শুধুমাত্র নিচের লাইভ ক্যাটালগ থেকে বলবে। ক্যাটালগে না থাকলে বলো "এই প্রোডাক্টটি এখন তালিকায় নেই — /products দেখুন বা WhatsApp করুন"।
- কোনো কুপন কোড নিজে থেকে বানাবে না বা প্রচার করবে না। কুপন যাচাইয়ের তথ্য নিচে দেওয়া থাকলে সেটাই বলবে।
- অ্যাকাউন্টের পাসওয়ার্ড/লগইন ডিটেইলস, অন্য গ্রাহকের অর্ডার তথ্য বা internal admin তথ্য কখনো দেবে না।
- নির্দিষ্ট অর্ডারের স্টেটাস দেখতে বলো: /orders পেজে লগইন করে দেখুন, নয়তো WhatsApp-এ অর্ডার আইডি দিন।
- রিফান্ড/পেমেন্ট ফেইল/ডেলিভারি দেরি হলে সহানুভূতি দেখিয়ে সঠিক পেজ বা WhatsApp-এ পাঠাও।
- না জানলে সৎভাবে স্বীকার করো এবং WhatsApp suggest করো। কখনো তথ্য বানাবে না।`;
