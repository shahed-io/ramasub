import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ShopConfig = {
  whatsapp_number: string;
  shop_name: string;
  support_hours: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  number: string;
  color: string;
  instructions?: string;
  logo_url?: string;
  brand_color?: string;
  send_money_label?: string;
  enable_checkout?: boolean;
  enable_wallet?: boolean;
};

export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  whatsapp_number: "8801580607614",
  shop_name: "AccessNow BD",
  support_hours: "9 AM – 12 AM",
};

export function useShopConfig() {
  return useQuery({
    queryKey: ["shop-config"],
    queryFn: async (): Promise<ShopConfig> => {
      const { data, error } = await supabase
        .from("admin_records")
        .select("data")
        .eq("kind", "shop_config")
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (error || !data) return DEFAULT_SHOP_CONFIG;
      return { ...DEFAULT_SHOP_CONFIG, ...((data.data as Partial<ShopConfig>) || {}) };
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function usePaymentMethods(audience?: "checkout" | "wallet") {
  return useQuery({
    queryKey: ["payment-methods", audience ?? "all"],
    queryFn: async (): Promise<PaymentMethod[]> => {
      const { data, error } = await supabase
        .from("admin_records")
        .select("data")
        .eq("kind", "payment_method")
        .eq("is_active", true)
        .order("sort_order");
      if (error || !data) return [];
      const all = data.map((r) => r.data as PaymentMethod);
      if (!audience) return all;
      return all.filter((m) => {
        if (audience === "checkout") return m.enable_checkout !== false;
        if (audience === "wallet") return m.enable_wallet === true;
        return true;
      });
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}

