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
  orb_from: "#1a1240",
  orb_via: "#2a1a5e",
  orb_to: "#0d1b3d",
  ring_color: "#7c3aed",
  spin_color_1: "#7c3aed",
  spin_color_2: "#00e5ff",
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
