import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SHOP_CONFIG, useShopConfig, type ShopConfig } from "@/hooks/useShopConfig";

const ShopConfigContext = createContext<ShopConfig>(DEFAULT_SHOP_CONFIG);

export function ShopConfigProvider({ children }: { children: ReactNode }) {
  const { data } = useShopConfig();
  return (
    <ShopConfigContext.Provider value={data ?? DEFAULT_SHOP_CONFIG}>
      {children}
    </ShopConfigContext.Provider>
  );
}

export function useShopConfigValue() {
  return useContext(ShopConfigContext);
}