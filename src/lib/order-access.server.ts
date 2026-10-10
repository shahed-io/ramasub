// Guest-safe order access: createOrder hands the buyer an HMAC token bound to the
// order id; reads/payment sessions require that token, the owning user, or an admin.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function hmacHex(message: string): Promise<string> {
  const secret = process.env["ORDER_ACCESS_SECRET"];
  if (!secret) throw new Error("Order access is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`order:${message}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function signOrderAccess(orderId: string): Promise<string> {
  return hmacHex(orderId);
}

async function verifyToken(orderId: string, token: string | undefined | null): Promise<boolean> {
  if (!token || token.length !== 64) return false;
  const expected = await hmacHex(orderId);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

async function callerUserId(request?: Request | null): Promise<string | null> {
  const auth = request?.headers?.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const { data } = await supabaseAdmin.auth.getUser(token);
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** True when the caller holds the order token, owns the order, or is an admin. */
export async function canAccessOrder(
  order: { id: string; user_id: string | null },
  token: string | undefined | null,
  request?: Request | null,
): Promise<boolean> {
  if (await verifyToken(order.id, token)) return true;
  const uid = await callerUserId(request);
  if (!uid) return false;
  if (order.user_id && order.user_id === uid) return true;
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}
