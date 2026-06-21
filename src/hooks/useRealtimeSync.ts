import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global realtime bridge: subscribes to the public tables that drive the
 * shop UI, and invalidates the matching React Query caches whenever the
 * admin panel writes a change. Mount once at the app root.
 *
 * Tables wired:
 *  - products            → product lists, detail pages
 *  - admin_records       → shop_config, payment_method, banner_slider, support_widget
 *  - orders              → user orders dashboards / admin orders
 *  - coupons             → admin coupons screen
 *  - promotions          → home promotions strip
 */
export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = supabase
      .channel("realtime:shop-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          qc.invalidateQueries({ queryKey: ["products"] });
          qc.invalidateQueries({ queryKey: ["product"] });
          qc.invalidateQueries({ queryKey: ["admin", "products"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_records" },
        (payload) => {
          const row =
            (payload.new as { kind?: string } | null) ??
            (payload.old as { kind?: string } | null);
          const kind = row?.kind;
          // Targeted invalidations based on record kind
          if (!kind || kind === "shop_config") {
            qc.invalidateQueries({ queryKey: ["shop-config"] });
          }
          if (!kind || kind === "payment_method") {
            qc.invalidateQueries({ queryKey: ["payment-methods", "all"] });
            qc.invalidateQueries({ queryKey: ["payment-methods", "checkout"] });
            qc.invalidateQueries({ queryKey: ["payment-methods", "wallet"] });
          }
          if (!kind || kind === "support_widget") {
            qc.invalidateQueries({ queryKey: ["support-widget-config"] });
          }
          // Banner slider has its own listener inside ImageBannerCarousel,
          // but invalidate any cached admin queries too.
          qc.invalidateQueries({ queryKey: ["admin-records", kind] });
          // Broadcast for non-query consumers (e.g. ImageBannerCarousel)
          window.dispatchEvent(
            new CustomEvent("admin-records:changed", { detail: { kind } }),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          qc.invalidateQueries({ queryKey: ["orders"] });
          qc.invalidateQueries({ queryKey: ["admin", "orders"] });
          qc.invalidateQueries({ queryKey: ["user-orders"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coupons" },
        () => {
          qc.invalidateQueries({ queryKey: ["coupons"] });
          qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promotions" },
        () => {
          qc.invalidateQueries({ queryKey: ["promotions"] });
          qc.invalidateQueries({ queryKey: ["admin", "promotions"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
