import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin role required");
  const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");
  await assertAdminMfaGrant(userId);
}

export type DownloadEntry = {
  label: string;
  url: string;
  platform?: string; // windows/mac/android/ios/web/other
  version?: string;
  size?: string;
  notes?: string;
};

/** List products + their attached downloads (from products.meta.downloads). Admin-only. */
export const listProductsWithDownloads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (sa as any)
      .from("products")
      .select("slug,name,image_url,category,is_active,meta")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p: any) => ({
      slug: p.slug,
      name: p.name,
      image_url: p.image_url,
      category: p.category,
      is_active: p.is_active,
      downloads: Array.isArray(p.meta?.downloads) ? (p.meta.downloads as DownloadEntry[]) : [],
    }));
  });

/** Replace the downloads array for a product. Admin-only. */
export const setProductDownloads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      slug: z.string().min(1),
      downloads: z.array(
        z.object({
          label: z.string().min(1),
          url: z.string().url(),
          platform: z.string().optional(),
          version: z.string().optional(),
          size: z.string().optional(),
          notes: z.string().optional(),
        }),
      ),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: e1 } = await (sa as any)
      .from("products")
      .select("meta")
      .eq("slug", data.slug)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!existing) throw new Error("Product not found");

    const meta = { ...(existing.meta || {}), downloads: data.downloads };
    const { error } = await (sa as any)
      .from("products")
      .update({ meta })
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.downloads.length };
  });

/** Server-side helper: gather download links for an order's items. */
async function collectDownloadsForOrder(sa: any, orderId: string) {
  const { data: order, error } = await sa
    .from("orders")
    .select("id,email,full_name,items,status,delivered_credentials,created_at")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) throw new Error(error?.message || "Order not found");

  const slugs = Array.from(
    new Set(
      (Array.isArray(order.items) ? order.items : [])
        .map((it: any) => it?.slug)
        .filter(Boolean),
    ),
  );
  if (slugs.length === 0) return { order, entries: [] as Array<DownloadEntry & { product: string; productSlug: string }> };

  const { data: products } = await sa
    .from("products")
    .select("slug,name,meta")
    .in("slug", slugs);

  const entries: Array<DownloadEntry & { product: string; productSlug: string }> = [];
  for (const p of (products ?? []) as any[]) {
    const list = Array.isArray(p.meta?.downloads) ? p.meta.downloads : [];
    for (const d of list as DownloadEntry[]) {
      if (!d?.url) continue;
      entries.push({ ...d, product: p.name, productSlug: p.slug });
    }
  }
  return { order, entries };
}

/** Send the "downloads ready" email to the order's customer + record it on the order. */
async function sendDownloadEmailInternal(sa: any, orderId: string) {
  const { order, entries } = await collectDownloadsForOrder(sa, orderId);
  if (entries.length === 0) return { ok: false, reason: "no_downloads_configured", sent: 0 };
  if (!order.email) return { ok: false, reason: "no_customer_email", sent: 0 };

  // 1) Persist on the order so it also shows in the customer's dashboard.
  const existing = (order.delivered_credentials || {}) as any;
  const merged = {
    ...existing,
    downloads: entries,
    downloads_delivered_at: new Date().toISOString(),
  };
  await sa.from("orders").update({ delivered_credentials: merged }).eq("id", order.id);

  // 2) Enqueue the email through the shared transactional pipeline.
  const url = process.env.SUPABASE_URL || "";
  const base = url.replace(/\/$/, "");
  const emailEndpoint = base.includes("supabase.co")
    ? "https://ramasub.com/lovable/email/transactional/send"
    : "http://localhost:8080/lovable/email/transactional/send";

  // Use service-role JWT as bearer so the send route (which requires auth) accepts our call.
  const jwt = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  try {
    const res = await fetch(emailEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        templateName: "software-download-ready",
        recipientEmail: order.email,
        idempotencyKey: `dl-${order.id}`,
        templateData: {
          name: order.full_name || "",
          orderId: order.id,
          downloads: entries,
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, reason: `email_failed:${res.status}:${t.slice(0, 120)}`, sent: 0 };
    }
  } catch (e: any) {
    return { ok: false, reason: `email_error:${e?.message || e}`, sent: 0 };
  }

  return { ok: true, sent: entries.length };
}

/** Admin-triggered: deliver downloads (attach + email) for an order. */
export const deliverDownloadsForOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
    return sendDownloadEmailInternal(sa as any, data.orderId);
  });

/** Shared entry used by the public cron/trigger endpoint. */
export async function deliverDownloadsInternal(sa: any, orderId: string) {
  return sendDownloadEmailInternal(sa, orderId);
}
