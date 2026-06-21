import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SupportWidgetConfig = {
  orb_from: string;
  orb_via: string;
  orb_to: string;
  ring_color: string;
  spin_color_1: string;
  spin_color_2: string;
  icon_color: string;
};

export const DEFAULT_SUPPORT_WIDGET: SupportWidgetConfig = {
  orb_from: "#6d28d9",
  orb_via: "#7c3aed",
  orb_to: "#5b21b6",
  ring_color: "#7c3aed",
  spin_color_1: "#a78bfa",
  spin_color_2: "#c4b5fd",
  icon_color: "#ffffff",
};

export function useSupportWidgetConfig() {
  return useQuery({
    queryKey: ["support-widget-config"],
    queryFn: async (): Promise<SupportWidgetConfig> => {
      const { data, error } = await supabase
        .from("admin_records")
        .select("data")
        .eq("kind", "support_widget")
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (error || !data) return DEFAULT_SUPPORT_WIDGET;
      return { ...DEFAULT_SUPPORT_WIDGET, ...((data.data as Partial<SupportWidgetConfig>) || {}) };
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
