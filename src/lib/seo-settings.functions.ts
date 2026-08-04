import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

export type SeoSettings = {
  site_title: string;
  site_description: string;
  og_image: string;
  twitter_handle: string;
  google_site_verification: string;
  bing_site_verification: string;
  yandex_site_verification: string;
  facebook_domain_verification: string;
  ga4_measurement_id: string;
  google_tag_manager_id: string;
};

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  site_title: "Rama Sub — Premium Subscriptions at BD Prices",
  site_description:
    "Rama Sub — Bangladesh এর trusted premium subscription shop। ChatGPT Plus, Claude, Adobe, Office 365, Zoom, Coursera, Canva সহ সব premium tool সবচেয়ে কম দামে। Instant delivery, warranty ও 24/7 support।",
  og_image: "https://ramasub.com/og-cover.jpg",
  twitter_handle: "@ramasub",
  google_site_verification: "",
  bing_site_verification: "",
  yandex_site_verification: "",
  facebook_domain_verification: "",
  ga4_measurement_id: "",
  google_tag_manager_id: "",
};

/** Public, anon-readable. Used by __root.tsx to inject verification meta + GA4. */
export const getSeoSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SeoSettings> => {
  try {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await sb
      .from("admin_records")
      .select("data")
      .eq("kind", "seo_settings")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const stored = (data?.data ?? {}) as Partial<SeoSettings>;
    return { ...DEFAULT_SEO_SETTINGS, ...stored };
  } catch {
    return DEFAULT_SEO_SETTINGS;
  }
});

/** Admin-only save. */
export const saveSeoSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<SeoSettings>) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    {
      const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");
      await assertAdminMfaGrant(context.userId);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const merged: SeoSettings = { ...DEFAULT_SEO_SETTINGS, ...data };

    const { data: existing } = await supabaseAdmin
      .from("admin_records")
      .select("id")
      .eq("kind", "seo_settings")
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("admin_records")
        .update({ data: merged as never, is_active: true })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("admin_records")
        .insert({ kind: "seo_settings", data: merged as never, is_active: true });
      if (error) throw error;
    }

    return { ok: true, settings: merged };
  });
