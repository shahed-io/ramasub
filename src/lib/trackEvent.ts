/**
 * Universal client-side tracking helper.
 * Fires events to whichever tracking pixels are enabled (FB Pixel, Google Ads, Other).
 * Also sends the same event to Meta CAPI (server-side) with a shared event_id
 * so browser + server events are deduplicated by Meta.
 * Safe no-op during SSR.
 */

import { sendFbCapiEvent } from "@/lib/fb-capi-event.functions";

type EventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase"
  | "Lead"
  | "CompleteRegistration"
  | "Search"
  | (string & {});

type EventParams = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function genEventId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type CapiUserData = {
  email?: string;
  phone?: string;
  external_id?: string;
};

export function trackEvent(
  name: EventName,
  params: EventParams = {},
  userData: CapiUserData = {},
  suppliedEventId?: string,
) {
  if (typeof window === "undefined") return;

  const eventId = suppliedEventId || genEventId();

  // Facebook Pixel (browser)
  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", name, params, { eventID: eventId });
    }
  } catch {
    /* ignore */
  }

  // Facebook CAPI (server) — fires in parallel, same event_id → Meta dedupes.
  // Fire-and-forget; never blocks the UI or throws to callers.
  try {
    void sendFbCapiEvent({
      data: {
        event_name: name,
        event_id: eventId,
        event_source_url:
          typeof window.location !== "undefined" ? window.location.href : undefined,
        custom_data: params,
        user_data: {
          email: userData.email,
          phone: userData.phone,
          external_id: userData.external_id,
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc"),
          client_user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
      },
    }).catch(() => {
      /* CAPI failures should never break client tracking */
    });
  } catch {
    /* ignore */
  }

  // Google Ads / GA4 via gtag
  try {
    if (typeof window.gtag === "function") {
      const gaName =
        name === "Purchase"
          ? "purchase"
          : name === "AddToCart"
            ? "add_to_cart"
            : name === "InitiateCheckout"
              ? "begin_checkout"
              : name === "ViewContent"
                ? "view_item"
                : name === "Search"
                  ? "search"
                  : name === "Lead"
                    ? "generate_lead"
                    : name === "CompleteRegistration"
                      ? "sign_up"
                      : name.toLowerCase();
      window.gtag("event", gaName, params);
    }
  } catch {
    /* ignore */
  }

  // Generic dataLayer push for any custom GTM/other pixels listening
  try {
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name, eventId, ...params });
    }
  } catch {
    /* ignore */
  }
}

export function trackPurchase(args: {
  value: number;
  currency?: string;
  orderId?: string;
  email?: string;
  phone?: string;
  items?: Array<{ id: string; name?: string; price?: number; quantity?: number }>;
  eventId?: string;
}) {
  trackEvent(
    "Purchase",
    {
      value: args.value,
      currency: args.currency ?? "BDT",
      transaction_id: args.orderId,
      contents: args.items?.map((i) => ({
        id: i.id,
        quantity: i.quantity ?? 1,
        item_price: i.price,
      })),
      num_items: args.items?.reduce((s, i) => s + (i.quantity ?? 1), 0) ?? 1,
    },
    { email: args.email, phone: args.phone, external_id: args.orderId },
    args.eventId,
  );
}

export function trackAddToCart(args: {
  id: string;
  name?: string;
  value: number;
  currency?: string;
  quantity?: number;
}) {
  trackEvent("AddToCart", {
    content_ids: [args.id],
    content_name: args.name,
    content_type: "product",
    value: args.value,
    currency: args.currency ?? "BDT",
    quantity: args.quantity ?? 1,
  });
}

export function trackViewContent(args: {
  id: string;
  name?: string;
  value?: number;
  currency?: string;
}) {
  trackEvent("ViewContent", {
    content_ids: [args.id],
    content_name: args.name,
    content_type: "product",
    value: args.value,
    currency: args.currency ?? "BDT",
  });
}
