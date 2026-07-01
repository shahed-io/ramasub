import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

export type ZoomSettings = {
  enabled: boolean;
  trigger: "hover" | "click"; // hover on desktop, click/tap toggle
  scale: number;              // final zoom level, e.g. 1.5, 2, 2.5
  duration_ms: number;        // transition duration in ms
  easing: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
  follow_cursor: boolean;     // pan with mouse position
};

export const DEFAULT_ZOOM_SETTINGS: ZoomSettings = {
  enabled: true,
  trigger: "hover",
  scale: 1.6,
  duration_ms: 300,
  easing: "ease-out",
  follow_cursor: true,
};

function clampSettings(s: Partial<ZoomSettings>): ZoomSettings {
  const merged = { ...DEFAULT_ZOOM_SETTINGS, ...s };
  return {
    ...merged,
    scale: Math.min(4, Math.max(1.1, Number(merged.scale) || DEFAULT_ZOOM_SETTINGS.scale)),
    duration_ms: Math.min(2000, Math.max(0, Math.round(Number(merged.duration_ms) || DEFAULT_ZOOM_SETTINGS.duration_ms))),
    trigger: merged.trigger === "click" ? "click" : "hover",
    easing: (["linear", "ease", "ease-in", "ease-out", "ease-in-out"] as const).includes(merged.easing as never)
      ? merged.easing
      : DEFAULT_ZOOM_SETTINGS.easing,
    enabled: Boolean(merged.enabled),
    follow_cursor: Boolean(merged.follow_cursor),
  };
}

/** Public, anon-readable. Used on the product page. */
export const getZoomSettings = createServerFn({ method: "GET" }).handler(async (): Promise<ZoomSettings> => {
  try {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await sb
      .from("admin_records")
      .select("data")
      .eq("kind", "product_zoom_settings")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    return clampSettings((data?.data ?? {}) as Partial<ZoomSettings>);
  } catch {
    return DEFAULT_ZOOM_SETTINGS;
  }
});

/** Admin-only save. */
export const saveZoomSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<ZoomSettings>) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const merged = clampSettings(data);

    const { data: existing } = await supabaseAdmin
      .from("admin_records")
      .select("id")
      .eq("kind", "product_zoom_settings")
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
        .insert({ kind: "product_zoom_settings", data: merged as never, is_active: true });
      if (error) throw error;
    }

    return { ok: true, settings: merged };
  });
