import { createHash } from "crypto";

type PurchaseItem = {
  id: string;
  price?: number;
  quantity?: number;
};

type PurchaseInput = {
  orderId: string;
  value: number;
  currency: string;
  email?: string;
  phone?: string;
  items: PurchaseItem[];
};

const hash = (value: string) =>
  createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("01") && digits.length === 11) return `88${digits}`;
  if (digits.startsWith("1") && digits.length === 10) return `880${digits}`;
  return digits;
}

export async function sendMetaPurchaseForOrder(input: PurchaseInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("tracking_pixels")
    .select("pixel_id, access_token, events_config")
    .eq("provider", "facebook_pixel")
    .eq("enabled", true);

  if (error || !rows?.length) return { sent: 0, skipped: 0 };

  const userData: Record<string, string[]> = {
    external_id: [hash(input.orderId)],
  };
  if (input.email) userData.em = [hash(input.email)];
  if (input.phone) {
    const phone = normalizePhone(input.phone);
    if (phone) userData.ph = [hash(phone)];
  }

  let sent = 0;
  let skipped = 0;
  const eventId = `purchase_${input.orderId}`;

  await Promise.all(
    rows.map(async (row) => {
      const config = (row.events_config ?? {}) as {
        capi_enabled?: boolean;
        test_event_code?: string;
        events?: Record<string, boolean>;
      };
      const token = (row.access_token || "").trim() || process.env["FB_CAPI_ACCESS_TOKEN"];
      if (
        !row.pixel_id ||
        !token ||
        !config.capi_enabled ||
        config.events?.Purchase === false
      ) {
        skipped += 1;
        return;
      }

      const payload = {
        data: [{
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          event_source_url: "https://ramasub.com/checkout",
          user_data: userData,
          custom_data: {
            value: input.value,
            currency: input.currency,
            transaction_id: input.orderId,
            content_type: "product",
            content_ids: input.items.map((item) => item.id),
            contents: input.items.map((item) => ({
              id: item.id,
              quantity: item.quantity ?? 1,
              item_price: item.price,
            })),
            num_items: input.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
          },
        }],
        ...(config.test_event_code ? { test_event_code: config.test_event_code } : {}),
      };

      try {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(row.pixel_id)}/events?access_token=${encodeURIComponent(token)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const result = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
          events_received?: number;
          fbtrace_id?: string;
        };
        const ok = response.ok && !result.error;
        if (ok) sent += 1;

        await supabaseAdmin.from("tracking_events_log").insert({
          provider: "facebook_pixel",
          event_name: "Purchase",
          payload: { pixel_id: row.pixel_id, event_id: eventId, source: "order_server" } as never,
          status: ok ? "sent" : "failed",
          response: result as never,
          error_message: ok ? null : result.error?.message ?? `HTTP ${response.status}`,
        } as never);
      } catch (caught) {
        await supabaseAdmin.from("tracking_events_log").insert({
          provider: "facebook_pixel",
          event_name: "Purchase",
          payload: { pixel_id: row.pixel_id, event_id: eventId, source: "order_server" } as never,
          status: "failed",
          error_message: caught instanceof Error ? caught.message : "Network error",
        } as never);
      }
    }),
  );

  return { sent, skipped };
}