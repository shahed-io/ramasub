import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import getProduct from "./tools/get-product";
import listMyOrders from "./tools/list-my-orders";
import getMyWallet from "./tools/get-my-wallet";
import getMyProfile from "./tools/get-my-profile";

// The OAuth issuer MUST be the direct Supabase host. Read the project ref via
// import.meta.env (Vite inlines at build time). Fallback keeps issuer well-formed
// during manifest extraction; the published build inlines the real ref.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ramasub-mcp",
  title: "Rama Sub",
  version: "0.1.0",
  instructions:
    "Tools for Rama Sub — a digital subscription shop. Use `list_products` / `get_product` to browse the public catalog, and `list_my_orders`, `get_my_wallet`, `get_my_profile` to access the signed-in user's own account data. All account tools respect row-level security and only return the caller's data.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, getProduct, listMyOrders, getMyWallet, getMyProfile],
});
