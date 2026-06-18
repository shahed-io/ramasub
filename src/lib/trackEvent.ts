/**
 * Universal client-side tracking helper.
 * Fires events to whichever tracking pixels are enabled (FB Pixel, Google Ads, Other).
 * Safe no-op during SSR.
 */

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

export function trackEvent(name: EventName, params: EventParams = {}) {
  if (typeof window === "undefined") return;

  // Facebook Pixel
  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", name, params);
    }
  } catch {
    /* ignore */
  }

  // Google Ads / GA4 via gtag
  try {
    if (typeof window.gtag === "function") {
      // Map common FB event names to GA equivalents
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
      window.dataLayer.push({ event: name, ...params });
    }
  } catch {
    /* ignore */
  }
}

export function trackPurchase(args: {
  value: number;
  currency?: string;
  orderId?: string;
  items?: Array<{ id: string; name?: string; price?: number; quantity?: number }>;
}) {
  trackEvent("Purchase", {
    value: args.value,
    currency: args.currency ?? "BDT",
    transaction_id: args.orderId,
    contents: args.items?.map((i) => ({
      id: i.id,
      quantity: i.quantity ?? 1,
      item_price: i.price,
    })),
    num_items: args.items?.reduce((s, i) => s + (i.quantity ?? 1), 0) ?? 1,
  });
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
