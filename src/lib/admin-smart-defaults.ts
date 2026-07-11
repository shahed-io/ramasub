// Smart defaults for admin single-settings forms.
// When an admin_records row for a `kind` does not exist yet, we prefill the
// form from data that already lives elsewhere on the site (shop config,
// footer, contact, site URL, product/customer counts, etc.) so the admin
// sees populated fields instead of blank inputs.
//
// The values returned here are ONLY used as initial UI state — nothing is
// written to the database until the admin clicks "Save settings".

import { supabase } from "@/integrations/supabase/client";
import type { AdminField } from "@/lib/admin-fields";
import { DEFAULT_SHOP_CONFIG } from "@/hooks/useShopConfig";

type Rec = Record<string, unknown>;

async function fetchKind(kind: string): Promise<Rec | null> {
  const { data } = await supabase
    .from("admin_records")
    .select("data")
    .eq("kind", kind)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.data as Rec) ?? null;
}

async function fetchShop() {
  const row = (await fetchKind("shop_config")) ?? {};
  return {
    whatsapp_number: (row.whatsapp_number as string) || DEFAULT_SHOP_CONFIG.whatsapp_number,
    shop_name: (row.shop_name as string) || DEFAULT_SHOP_CONFIG.shop_name,
    support_hours: (row.support_hours as string) || DEFAULT_SHOP_CONFIG.support_hours,
  };
}

async function fetchFeaturedProduct(): Promise<{ slug: string; name: string; image_url?: string } | null> {
  const { data } = await supabase
    .from("products")
    .select("slug,name,image_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!data?.slug || !data?.name) return null;
  return {
    slug: String(data.slug),
    name: String(data.name),
    image_url: data.image_url ? String(data.image_url) : undefined,
  };
}

type BiggestDiscount = {
  slug: string;
  name: string;
  image_url?: string;
  percent: number;
  original_price: number;
  sale_price: number;
};

async function fetchBiggestDiscount(): Promise<BiggestDiscount | null> {
  const { data } = await supabase
    .from("products")
    .select("slug,name,image_url,plans")
    .eq("is_active", true);
  if (!data) return null;
  let best: BiggestDiscount | null = null;
  for (const p of data) {
    const plans = Array.isArray(p.plans) ? (p.plans as Array<Record<string, unknown>>) : [];
    for (const plan of plans) {
      const orig = Number(plan?.original_price ?? 0);
      const price = Number(plan?.price ?? 0);
      if (!orig || !price || orig <= price) continue;
      const pct = Math.round(((orig - price) / orig) * 100);
      if (!best || pct > best.percent) {
        best = {
          slug: String(p.slug),
          name: String(p.name),
          image_url: p.image_url ? String(p.image_url) : undefined,
          percent: pct,
          original_price: orig,
          sale_price: price,
        };
      }
    }
  }
  return best;
}

function siteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "https://ramasub.com";
}

/**
 * Compute prefilled values for a given `kind`. Only keys that appear in
 * `fields` are returned, so unknown fields never leak through.
 */
export async function getSmartDefaults(kind: string, fields: AdminField[]): Promise<Rec> {
  const origin = siteOrigin();
  const [shop, footerRow, supportRow, seoRow, siteRow, featuredProduct, biggestDiscount] = await Promise.all([
    fetchShop(),
    fetchKind("footer"),
    fetchKind("support_channels"),
    fetchKind("seo_settings"),
    fetchKind("site_settings"),
    fetchFeaturedProduct(),
    fetchBiggestDiscount(),
  ]);
  const host = origin.replace(/^https?:\/\//, "");
  const brand = shop.shop_name;
  const wa = shop.whatsapp_number;

  // Also pull optional sibling records so downstream kinds can inherit them.
  const footer = footerRow ?? {};
  const support = supportRow ?? {};
  const seo = seoRow ?? {};
  const site = siteRow ?? {};

  // Full defaults map keyed by admin_records.kind
  const map: Rec = {};

  switch (kind) {
    case "shop_config":
      Object.assign(map, shop);
      break;

    case "site_settings":
      map.site_name = brand;
      map.logo_url = site.logo_url || "";
      map.favicon_url = site.favicon_url || "";
      map.currency = "BDT";
      map.timezone = "Asia/Dhaka";
      map.maintenance_mode = false;
      break;

    case "footer":
      map.about = footer.about || `${brand} — Bangladesh এর বিশ্বস্ত ডিজিটাল সাবস্ক্রিপশন ও সফটওয়্যার শপ।`;
      map.address = footer.address || "Dhaka, Bangladesh";
      map.email = footer.email || `support@${host.replace(/^www\./, "")}`;
      map.phone = footer.phone || `+${wa}`;
      map.facebook = footer.facebook || "";
      map.youtube = footer.youtube || "";
      map.telegram = footer.telegram || "";
      break;

    case "support_channels":
      map.phone = support.phone || `+${wa}`;
      map.email = support.email || `support@${host.replace(/^www\./, "")}`;
      map.whatsapp = support.whatsapp || wa;
      map.telegram = support.telegram || "";
      map.messenger = support.messenger || "";
      map.hours = support.hours || shop.support_hours;
      break;

    case "whatsapp_button":
      map.enabled = true;
      map.phone = wa;
      map.message = `হ্যালো ${brand}, আমি একটি product সম্পর্কে জানতে চাই।`;
      map.position = "bottom-right";
      map.background_color = "#25D366";
      map.icon_color = "#ffffff";
      map.size = 56;
      map.offset_x = 20;
      map.offset_y = 20;
      map.show_greeting = true;
      map.greeting_title = `${brand} Support`;
      map.greeting_subtitle = shop.support_hours
        ? `Online: ${shop.support_hours}`
        : "Typically replies within minutes";
      map.greeting_message = `হ্যালো! ${brand}-এ স্বাগতম। কীভাবে সাহায্য করতে পারি?`;
      map.pulse_animation = true;
      map.show_on_mobile = true;
      map.show_on_desktop = true;
      break;

    case "welcome_popup":
      map.enabled = true;
      map.title = `${brand}-এ স্বাগতম!`;
      map.message = featuredProduct
        ? `${featuredProduct.name} সহ জনপ্রিয় digital product এখন instant delivery ও support সহ অর্ডার করুন।`
        : "প্রথম অর্ডারে বিশেষ ছাড় পেতে এখনই কেনাকাটা শুরু করুন।";
      map.image_url = featuredProduct?.image_url || site.logo_url || "";
      map.cta_text = "Shop now";
      map.cta_link = featuredProduct ? `/product/${featuredProduct.slug}` : "/";
      break;

    case "announcement_bar":
      map.enabled = true;
      map.text = `⚡ ${brand} — Instant delivery, 24/7 support। WhatsApp: +${wa}`;
      map.background = "#0f172a";
      map.color = "#ffffff";
      break;

    case "biggest_discount":
      map.enabled = false;
      map.title = "Biggest Discount of the Season";
      map.percent = 20;
      map.link = "/";
      break;

    case "homepage":
      map.hero_title = `${brand} — Trusted Digital Store`;
      map.hero_subtitle = "Premium subscriptions ও software instant delivery, verified & guaranteed।";
      map.hero_cta = "Shop Now";
      map.hero_cta_link = "/";
      map.show_featured = true;
      map.show_reviews = true;
      break;

    case "ceo_message":
      map.name = "Mahbub";
      map.title = `Founder & CEO, ${brand}`;
      map.photo_url = site.logo_url || featuredProduct?.image_url || "";
      map.message = `${brand}-এর যাত্রায় আপনাকে স্বাগতম। আমরা বাংলাদেশের গ্রাহকদের জন্য বিশ্বস্ত ডিজিটাল সেবা দিতে প্রতিশ্রুতিবদ্ধ।`;
      break;

    case "checkout_policy":
      map.min_order = 50;
      map.terms = `${brand}-এ অর্ডার করার মাধ্যমে আপনি আমাদের terms ও refund policy মেনে নিচ্ছেন।`;
      map.require_phone = true;
      map.require_email = false;
      break;

    case "invoice_settings":
    case "invoice_design":
      map.company_name = brand;
      map.address = (footer.address as string) || "Dhaka, Bangladesh";
      map.tagline = "Trusted Digital Store";
      map.primary_color = "#7c3aed";
      map.accent_color = "#0ea5e9";
      map.show_logo = true;
      map.show_signature = true;
      map.footer_note = `ধন্যবাদ ${brand}-এ কেনাকাটার জন্য। যেকোনো সহায়তায়: +${wa}`;
      map.thank_you_text = "Thank you for your order!";
      break;

    case "seo_settings":
      map.site_url = seo.site_url || origin;
      map.default_title = seo.default_title || `${brand} — Trusted Digital Store in Bangladesh`;
      map.default_description = seo.default_description || `${brand}-এ পাচ্ছেন premium subscriptions ও software, instant delivery ও 24/7 support সহ।`;
      map.robots_txt = seo.robots_txt || `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml`;
      break;

    case "analytics_settings":
      map.show_revenue = true;
      map.show_orders = true;
      map.show_traffic = true;
      break;

    case "ai_api_settings":
      map.default_model = "google/gemini-2.5-flash";
      map.system_prompt = `You are the assistant for ${brand}, a digital subscription store in Bangladesh. Reply concisely and helpfully in Bangla or English matching the user.`;
      map.temperature = 0.7;
      break;

    case "backup_settings":
      map.auto_backup = true;
      map.frequency = "weekly";
      map.retention_days = 30;
      break;

    case "support_widget":
      map.orb_from = "#7c3aed";
      map.orb_via = "#a855f7";
      map.orb_to = "#0ea5e9";
      map.ring_color = "#a855f7";
      map.spin_color_1 = "#7c3aed";
      map.spin_color_2 = "#0ea5e9";
      map.icon_color = "#ffffff";
      break;

    case "referral_settings":
      map.enabled = true;
      map.reward_amount = 50;
      map.min_purchase = 100;
      map.terms = `প্রতি successful referral-এ আপনি ৳50 wallet credit পাবেন। Referred customer এর প্রথম অর্ডার ৳100 বা তার বেশি হতে হবে। ${brand} যেকোনো সময় terms পরিবর্তনের অধিকার রাখে।`;
      break;

    case "bkash_pgw":
    case "eps_pgw":
    case "sslcommerz_pgw":
      map.enabled = false;
      map.environment = "sandbox";
      map.callback_url = `${origin}/api/public/${kind.replace("_pgw", "")}/callback`;
      break;

    case "fb_pixel":
    case "google_ads":
    case "ga4_realtime":
      // Nothing sensible to prefill without user creds — leave blank.
      break;
  }

  // Filter to only fields that exist on this form, drop empty values.
  const allowed = new Set(fields.map((f) => f.name));
  const out: Rec = {};
  for (const [k, v] of Object.entries(map)) {
    if (!allowed.has(k)) continue;
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}
