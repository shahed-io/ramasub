// Per-feature field configs powering the generic admin CRUD UI.
// Each "kind" maps to a list of fields. Mode "list" = many records, "single" = key/value settings.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "url"
  | "image"
  | "boolean"
  | "select"
  | "color"
  | "date";

export type AdminField = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  primary?: boolean; // shown as the row title in list view
  min?: number;        // numeric min (number) / min length (text/textarea)
  max?: number;        // numeric max (number) / max length (text/textarea)
  maxLength?: number;  // explicit max length for text fields
  pattern?: string;    // regex source for text fields
  patternMessage?: string;
  hint?: string;       // small helper text below the field
  autoFrom?: string;   // auto-derive value from another field (until user edits this one)
  autoTransform?: "slug"; // how to derive: slugify the source value
};

export function slugify(input: string): string {
  return String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['"]+/g, "")
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}


export function validateField(field: AdminField, value: unknown): string | null {
  const isEmpty = value == null || value === "" || (typeof value === "number" && Number.isNaN(value));
  if (field.required && isEmpty) return `${field.label} is required`;
  if (isEmpty) return null;

  if (field.type === "url" || field.type === "image") {
    try { new URL(String(value)); } catch { return `${field.label} must be a valid URL (https://…)`; }
  }
  if (field.type === "number") {
    const n = Number(value);
    if (Number.isNaN(n)) return `${field.label} must be a number`;
    if (field.min != null && n < field.min) return `${field.label} must be ≥ ${field.min}`;
    if (field.max != null && n > field.max) return `${field.label} must be ≤ ${field.max}`;
  }
  if (field.type === "text" || field.type === "textarea") {
    const s = String(value);
    const max = field.maxLength ?? field.max;
    if (field.min != null && s.length < field.min) return `${field.label} must be at least ${field.min} characters`;
    if (max != null && s.length > max) return `${field.label} must be at most ${max} characters`;
    if (field.pattern) {
      try {
        if (!new RegExp(field.pattern).test(s)) return field.patternMessage ?? `${field.label} has an invalid format`;
      } catch { /* ignore bad regex */ }
    }
  }
  if (field.type === "color") {
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value))) return `${field.label} must be a hex color (e.g. #1f2937)`;
  }
  return null;
}

export type AdminFeatureConfig = {
  kind: string;            // value stored in admin_records.kind
  mode: "list" | "single"; // list = CRUD, single = settings (one row)
  fields: AdminField[];
  description?: string;
};

const FEATURES: Record<string, AdminFeatureConfig> = {
  "banner-slider": {
    kind: "banner_slider",
    mode: "list",
    description: "Homepage hero carousel slides. Drag-style ordering via sort order.",
    fields: [
      { name: "category", label: "Category tag (e.g. STREAMING · DIGITAL)", type: "text" },
      { name: "title", label: "Title", type: "text", required: true, primary: true },
      { name: "subtitle", label: "Subtitle / description", type: "textarea" },
      { name: "price_text", label: "Price text (e.g. মাত্র ৳350 থেকে)", type: "text" },
      { name: "color_preset", label: "Readymade theme", type: "select", options: [
        { value: "ruby", label: "Ruby (Netflix red)" },
        { value: "spotify", label: "Spotify green" },
        { value: "canva", label: "Canva blue/purple" },
        { value: "eid", label: "Eid festive pink/gold" },
        { value: "ocean", label: "Ocean blue" },
        { value: "violet", label: "Violet" },
        { value: "emerald", label: "Emerald" },
        { value: "graphite", label: "Graphite" },
        { value: "indigo", label: "Indigo" },
        { value: "sunset", label: "Sunset orange" },
      ] },
      { name: "bg_style", label: "Background style", type: "select", options: [
        { value: "spotlight", label: "Spotlight (cinematic side glow)" },
        { value: "aurora", label: "Aurora (multi-corner glow)" },
        { value: "mesh", label: "Mesh (4-point gradient mesh)" },
        { value: "nebula", label: "Nebula (deep cosmic glow)" },
      ] },
      { name: "overlay_intensity", label: "Glow intensity", type: "select", options: [
        { value: "low", label: "Low (subtle)" },
        { value: "medium", label: "Medium (default)" },
        { value: "high", label: "High (vibrant)" },
      ] },
      { name: "bg_color", label: "Custom background color (optional, hex)", type: "text" },
      { name: "accent_color", label: "Custom accent/primary color (optional, hex)", type: "text" },
      { name: "glow_color", label: "Custom glow color (optional, hex)", type: "text" },
      { name: "cta", label: "Primary button text", type: "text" },
      { name: "link", label: "Primary button link", type: "url" },
      { name: "secondary_cta", label: "Secondary button text", type: "text" },
      { name: "secondary_link", label: "Secondary button link", type: "url" },
      { name: "image_url", label: "Right-side image (upload or URL)", type: "image" },
      { name: "min_height", label: "Banner height (px, default 430)", type: "number", min: 240, max: 900 },
      { name: "delivery_text", label: "Delivery stat (e.g. Instant)", type: "text" },
      { name: "support_text", label: "Support stat (e.g. 24/7)", type: "text" },
      { name: "rating_text", label: "Rating stat (e.g. 4.9 ★)", type: "text" },
    ],
  },
  "welcome-popup": {
    kind: "welcome_popup",
    mode: "single",
    description: "Popup shown to first-time visitors.",
    fields: [
      { name: "enabled", label: "Enabled", type: "boolean" },
      { name: "title", label: "Title", type: "text" },
      { name: "message", label: "Message", type: "textarea" },
      { name: "image_url", label: "Image URL", type: "image" },
      { name: "cta_text", label: "Button text", type: "text" },
      { name: "cta_link", label: "Button link", type: "url" },
    ],
  },
  "announcement-bar": {
    kind: "announcement_bar",
    mode: "single",
    description: "Top-of-site marquee/announcement.",
    fields: [
      { name: "enabled", label: "Enabled", type: "boolean" },
      { name: "text", label: "Announcement text", type: "textarea", required: true },
      { name: "link", label: "Link URL", type: "url" },
      { name: "background", label: "Background color", type: "color" },
      { name: "color", label: "Text color", type: "color" },
    ],
  },
  "reviews": {
    kind: "review",
    mode: "list",
    description: "Customer reviews & testimonials.",
    fields: [
      { name: "name", label: "Customer name", type: "text", required: true, primary: true },
      { name: "rating", label: "Rating (1-5)", type: "number" },
      { name: "product", label: "Product", type: "text" },
      { name: "comment", label: "Review", type: "textarea" },
      { name: "avatar_url", label: "Avatar URL", type: "image" },
      { name: "approved", label: "Approved", type: "boolean" },
    ],
  },
  "biggest-discount": {
    kind: "biggest_discount",
    mode: "single",
    fields: [
      { name: "enabled", label: "Enabled", type: "boolean" },
      { name: "title", label: "Title", type: "text" },
      { name: "percent", label: "Discount %", type: "number" },
      { name: "ends_at", label: "Ends at", type: "date" },
      { name: "link", label: "Link URL", type: "url" },
    ],
  },
  "whatsapp-button": {
    kind: "whatsapp_button",
    mode: "single",
    fields: [
      { name: "enabled", label: "Enabled", type: "boolean" },
      { name: "phone", label: "WhatsApp number", type: "text", required: true },
      { name: "message", label: "Default message", type: "text" },
      { name: "position", label: "Position", type: "select", options: [
        { value: "bottom-right", label: "Bottom right" },
        { value: "bottom-left", label: "Bottom left" },
      ] },
    ],
  },
  "media-gallery": {
    kind: "media",
    mode: "list",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, primary: true },
      { name: "url", label: "Image URL", type: "image", required: true },
      { name: "alt", label: "Alt text", type: "text" },
    ],
  },
  "homepage-editor": {
    kind: "homepage",
    mode: "single",
    fields: [
      { name: "hero_title", label: "Hero title", type: "text" },
      { name: "hero_subtitle", label: "Hero subtitle", type: "textarea" },
      { name: "hero_cta", label: "Hero button text", type: "text" },
      { name: "hero_cta_link", label: "Hero button link", type: "url" },
      { name: "show_featured", label: "Show featured products", type: "boolean" },
      { name: "show_reviews", label: "Show reviews", type: "boolean" },
    ],
  },
  "footer-editor": {
    kind: "footer",
    mode: "single",
    fields: [
      { name: "about", label: "About text", type: "textarea" },
      { name: "address", label: "Address", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "facebook", label: "Facebook URL", type: "url" },
      { name: "youtube", label: "YouTube URL", type: "url" },
      { name: "telegram", label: "Telegram URL", type: "url" },
    ],
  },
  "categories": {
    kind: "category",
    mode: "list",
    description: "Product categories. Slug is auto-generated from the name — edit only if you need a custom URL.",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, primary: true, placeholder: "e.g. Vision aids" },
      { name: "slug", label: "Slug (auto from name)", type: "text", autoFrom: "name", autoTransform: "slug", hint: "Used in the URL. Leave blank to auto-generate from the name.", pattern: "^[a-z0-9\\u0980-\\u09FF]+(?:-[a-z0-9\\u0980-\\u09FF]+)*$", patternMessage: "Use lowercase letters, numbers and hyphens only." },
      { name: "image_url", label: "Image", type: "image", hint: "Upload an image or paste a URL. Used as the category cover/thumbnail." },
      { name: "icon", label: "Icon (emoji, optional)", type: "text", placeholder: "👓", hint: "Used as a small badge when no image is set." },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },


  "wallet": {
    kind: "wallet_txn",
    mode: "list",
    fields: [
      { name: "user_email", label: "Customer email", type: "text", required: true, primary: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "type", label: "Type", type: "select", options: [
        { value: "credit", label: "Credit (+)" },
        { value: "debit", label: "Debit (-)" },
      ] },
      { name: "note", label: "Note", type: "text" },
    ],
  },
  "payments": {
    kind: "payment_method",
    mode: "list",
    fields: [
      { name: "name", label: "Method name (e.g. bKash, Nagad)", type: "text", required: true, primary: true },
      { name: "number", label: "Account / personal number", type: "text" },
      { name: "send_money_label", label: "Action label (e.g. Send Money, Cash In)", type: "text" },
      { name: "logo_url", label: "Logo image", type: "image" },
      { name: "brand_color", label: "Brand colour (hex, e.g. #E2136E)", type: "text" },
      { name: "instructions", label: "Step-by-step instructions (one per line)", type: "textarea" },
      { name: "enable_checkout", label: "Available at checkout", type: "boolean" },
      { name: "enable_wallet", label: "Available for wallet top-up", type: "boolean" },
    ],
  },

  "account-delivery": {
    kind: "account_delivery",
    mode: "list",
    fields: [
      { name: "order_ref", label: "Order ref", type: "text", primary: true, required: true },
      { name: "product", label: "Product", type: "text" },
      { name: "username", label: "Username/Email", type: "text" },
      { name: "password", label: "Password", type: "text" },
      { name: "notes", label: "Delivery notes", type: "textarea" },
      { name: "delivered", label: "Delivered", type: "boolean" },
    ],
  },
  "inventory": {
    kind: "inventory",
    mode: "list",
    fields: [
      { name: "product", label: "Product", type: "text", required: true, primary: true },
      { name: "stock", label: "Stock", type: "number" },
      { name: "low_stock_at", label: "Low-stock threshold", type: "number" },
      { name: "supplier", label: "Supplier", type: "text" },
    ],
  },
  "notifications": {
    kind: "notification",
    mode: "list",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, primary: true },
      { name: "body", label: "Body", type: "textarea" },
      { name: "audience", label: "Audience", type: "select", options: [
        { value: "all", label: "All customers" },
        { value: "admins", label: "Admins" },
      ] },
    ],
  },
  "checkout-policy": {
    kind: "checkout_policy",
    mode: "single",
    fields: [
      { name: "min_order", label: "Minimum order amount", type: "number" },
      { name: "terms", label: "Terms text", type: "textarea" },
      { name: "require_phone", label: "Require phone", type: "boolean" },
      { name: "require_email", label: "Require email", type: "boolean" },
    ],
  },
  "custom-invoice": {
    kind: "invoice_settings",
    mode: "single",
    fields: [
      { name: "company_name", label: "Company name", type: "text" },
      { name: "logo_url", label: "Logo URL", type: "image" },
      { name: "address", label: "Address", type: "textarea" },
      { name: "footer_note", label: "Invoice footer", type: "textarea" },
    ],
  },
  "coupons": {
    kind: "coupon",
    mode: "list",
    fields: [
      { name: "code", label: "Code", type: "text", required: true, primary: true },
      { name: "percent", label: "Discount %", type: "number" },
      { name: "amount", label: "Flat amount", type: "number" },
      { name: "min_order", label: "Min order amount", type: "number" },
      { name: "expires_at", label: "Expires at", type: "date" },
    ],
  },
  "referral": {
    kind: "referral_settings",
    mode: "single",
    fields: [
      { name: "enabled", label: "Enabled", type: "boolean" },
      { name: "reward_amount", label: "Reward amount", type: "number" },
      { name: "min_purchase", label: "Min purchase to qualify", type: "number" },
      { name: "terms", label: "Terms", type: "textarea" },
    ],
  },
  "affiliates": {
    kind: "affiliate",
    mode: "list",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, primary: true },
      { name: "email", label: "Email", type: "text" },
      { name: "code", label: "Promo code", type: "text" },
      { name: "commission_percent", label: "Commission %", type: "number" },
    ],
  },
  "marketing": {
    kind: "marketing_campaign",
    mode: "list",
    fields: [
      { name: "name", label: "Campaign name", type: "text", required: true, primary: true },
      { name: "channel", label: "Channel", type: "select", options: [
        { value: "email", label: "Email" },
        { value: "sms", label: "SMS" },
        { value: "push", label: "Push" },
      ] },
      { name: "message", label: "Message", type: "textarea" },
      { name: "scheduled_at", label: "Scheduled at", type: "date" },
    ],
  },
  "ad-campaigns": {
    kind: "ad_campaign",
    mode: "list",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, primary: true },
      { name: "platform", label: "Platform", type: "select", options: [
        { value: "facebook", label: "Facebook" },
        { value: "google", label: "Google" },
        { value: "tiktok", label: "TikTok" },
      ] },
      { name: "budget", label: "Budget", type: "number" },
      { name: "url", label: "Landing URL", type: "url" },
    ],
  },
  "fb-pixel": {
    kind: "fb_pixel",
    mode: "single",
    fields: [
      { name: "pixel_id", label: "Pixel ID", type: "text" },
      { name: "access_token", label: "CAPI access token", type: "text" },
      { name: "test_event_code", label: "Test event code", type: "text" },
    ],
  },
  "google-ads": {
    kind: "google_ads",
    mode: "single",
    fields: [
      { name: "ga4_id", label: "GA4 Measurement ID", type: "text" },
      { name: "gads_id", label: "Google Ads ID", type: "text" },
      { name: "conversion_label", label: "Conversion label", type: "text" },
    ],
  },
  "ga4-realtime": {
    kind: "ga4_realtime",
    mode: "single",
    fields: [
      { name: "property_id", label: "GA4 Property ID", type: "text" },
      { name: "api_secret", label: "API secret", type: "text" },
    ],
  },
  "search-console": {
    kind: "seo_settings",
    mode: "single",
    fields: [
      { name: "site_url", label: "Site URL", type: "url" },
      { name: "verification_meta", label: "Verification meta tag", type: "text" },
      { name: "default_title", label: "Default title", type: "text" },
      { name: "default_description", label: "Default description", type: "textarea" },
      { name: "robots_txt", label: "robots.txt content", type: "textarea" },
    ],
  },
  "tracking": {
    kind: "tracking_link",
    mode: "list",
    fields: [
      { name: "order_ref", label: "Order ref", type: "text", required: true, primary: true },
      { name: "courier", label: "Courier", type: "text" },
      { name: "tracking_no", label: "Tracking no.", type: "text" },
      { name: "url", label: "Tracking URL", type: "url" },
    ],
  },
  "tickets": {
    kind: "ticket",
    mode: "list",
    fields: [
      { name: "subject", label: "Subject", type: "text", required: true, primary: true },
      { name: "customer", label: "Customer", type: "text" },
      { name: "priority", label: "Priority", type: "select", options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ] },
      { name: "status", label: "Status", type: "select", options: [
        { value: "open", label: "Open" },
        { value: "pending", label: "Pending" },
        { value: "resolved", label: "Resolved" },
      ] },
      { name: "message", label: "Message", type: "textarea" },
    ],
  },
  "help-center": {
    kind: "help_article",
    mode: "list",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, primary: true },
      { name: "category", label: "Category", type: "text" },
      { name: "body", label: "Article body", type: "textarea" },
    ],
  },
  "support-channels": {
    kind: "support_channels",
    mode: "single",
    fields: [
      { name: "phone", label: "Support phone", type: "text" },
      { name: "email", label: "Support email", type: "text" },
      { name: "whatsapp", label: "WhatsApp", type: "text" },
      { name: "telegram", label: "Telegram", type: "text" },
      { name: "messenger", label: "Messenger URL", type: "url" },
      { name: "hours", label: "Working hours", type: "text" },
    ],
  },
  "support-widget": {
    kind: "support_widget",
    mode: "single",
    description: "Floating support chat bubble — colors, glow & icon styling.",
    fields: [
      { name: "orb_from", label: "Orb gradient – top color", type: "color" },
      { name: "orb_via", label: "Orb gradient – middle color", type: "color" },
      { name: "orb_to", label: "Orb gradient – bottom color", type: "color" },
      { name: "ring_color", label: "Pulsing outer glow color", type: "color" },
      { name: "spin_color_1", label: "Spinning ring color A", type: "color" },
      { name: "spin_color_2", label: "Spinning ring color B", type: "color" },
      { name: "icon_color", label: "Icon color", type: "color" },
    ],
  },
  "pages": {
    kind: "page",
    mode: "list",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, primary: true },
      { name: "slug", label: "Slug (auto from title)", type: "text", autoFrom: "title", autoTransform: "slug", hint: "Leave blank to auto-generate." },
      { name: "body", label: "Body (HTML/Markdown)", type: "textarea" },
      { name: "show_in_menu", label: "Show in menu", type: "boolean" },
    ],
  },
  "blog": {
    kind: "blog_post",
    mode: "list",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, primary: true },
      { name: "slug", label: "Slug (auto from title)", type: "text", autoFrom: "title", autoTransform: "slug", hint: "Leave blank to auto-generate." },

      { name: "excerpt", label: "Excerpt", type: "textarea" },
      { name: "cover_url", label: "Cover image URL", type: "image" },
      { name: "body", label: "Body", type: "textarea" },
      { name: "author", label: "Author", type: "text" },
    ],
  },
  "ceo-message": {
    kind: "ceo_message",
    mode: "single",
    fields: [
      { name: "name", label: "CEO name", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "photo_url", label: "Photo URL", type: "image" },
      { name: "message", label: "Message", type: "textarea" },
    ],
  },
  "software-downloads": {
    kind: "software_download",
    mode: "list",
    fields: [
      { name: "name", label: "Software name", type: "text", required: true, primary: true },
      { name: "version", label: "Version", type: "text" },
      { name: "platform", label: "Platform", type: "select", options: [
        { value: "windows", label: "Windows" },
        { value: "mac", label: "macOS" },
        { value: "android", label: "Android" },
        { value: "ios", label: "iOS" },
      ] },
      { name: "url", label: "Download URL", type: "url", required: true },
      { name: "size", label: "Size", type: "text" },
    ],
  },
  "analytics": {
    kind: "analytics_settings",
    mode: "single",
    fields: [
      { name: "show_revenue", label: "Show revenue widget", type: "boolean" },
      { name: "show_orders", label: "Show orders widget", type: "boolean" },
      { name: "show_traffic", label: "Show traffic widget", type: "boolean" },
    ],
  },
  "customer-insights": {
    kind: "customer_segment",
    mode: "list",
    fields: [
      { name: "name", label: "Segment name", type: "text", required: true, primary: true },
      { name: "criteria", label: "Criteria", type: "textarea" },
    ],
  },
  "reports": {
    kind: "report",
    mode: "list",
    fields: [
      { name: "name", label: "Report name", type: "text", required: true, primary: true },
      { name: "type", label: "Type", type: "select", options: [
        { value: "sales", label: "Sales" },
        { value: "customers", label: "Customers" },
        { value: "products", label: "Products" },
      ] },
      { name: "schedule", label: "Schedule", type: "text" },
    ],
  },
  "ai-api": {
    kind: "ai_api_settings",
    mode: "single",
    fields: [
      { name: "default_model", label: "Default model", type: "text" },
      { name: "system_prompt", label: "System prompt", type: "textarea" },
      { name: "temperature", label: "Temperature", type: "number" },
    ],
  },
  "shop-config": {
    kind: "shop_config",
    mode: "single",
    description: "WhatsApp number ও shop information যা product page, checkout এবং WhatsApp order button-এ ব্যবহার হবে।",
    fields: [
      { name: "whatsapp_number", label: "WhatsApp number (with country code, no +)", type: "text", required: true, placeholder: "8801580607614" },
      { name: "shop_name", label: "Shop name", type: "text", placeholder: "AccessNow BD" },
      { name: "support_hours", label: "Support hours", type: "text", placeholder: "9 AM – 12 AM" },
    ],
  },
  "settings": {
    kind: "site_settings",
    mode: "single",
    fields: [
      { name: "site_name", label: "Site name", type: "text" },
      { name: "logo_url", label: "Logo URL", type: "image" },
      { name: "favicon_url", label: "Favicon URL", type: "image" },
      { name: "currency", label: "Currency", type: "text" },
      { name: "timezone", label: "Timezone", type: "text" },
      { name: "maintenance_mode", label: "Maintenance mode", type: "boolean" },
    ],
  },
  "backup": {
    kind: "backup_settings",
    mode: "single",
    fields: [
      { name: "auto_backup", label: "Auto backup", type: "boolean" },
      { name: "frequency", label: "Frequency", type: "select", options: [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
      ] },
      { name: "retention_days", label: "Retention (days)", type: "number" },
    ],
  },
  "order-recovery": {
    kind: "order_recovery",
    mode: "list",
    fields: [
      { name: "customer", label: "Customer", type: "text", required: true, primary: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "amount", label: "Amount", type: "number" },
      { name: "stage", label: "Stage", type: "select", options: [
        { value: "abandoned", label: "Abandoned" },
        { value: "contacted", label: "Contacted" },
        { value: "recovered", label: "Recovered" },
      ] },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  "activity-log": {
    kind: "activity",
    mode: "list",
    fields: [
      { name: "actor", label: "Actor", type: "text", required: true, primary: true },
      { name: "action", label: "Action", type: "text" },
      { name: "target", label: "Target", type: "text" },
      { name: "details", label: "Details", type: "textarea" },
    ],
  },
  "ai-command": {
    kind: "ai_command",
    mode: "list",
    fields: [
      { name: "name", label: "Command name", type: "text", required: true, primary: true },
      { name: "trigger", label: "Trigger phrase", type: "text" },
      { name: "prompt", label: "AI prompt", type: "textarea" },
    ],
  },
  "add-product": {
    kind: "_redirect_products",
    mode: "single",
    fields: [],
  },
  "roles": {
    kind: "_redirect_users",
    mode: "single",
    fields: [],
  },

  /* ============== SALES — newly enabled features ============== */
  "abandoned-checkout": {
    kind: "abandoned_checkout",
    mode: "list",
    description: "Customers who started checkout but didn't pay. Follow up via WhatsApp/SMS.",
    fields: [
      { name: "customer", label: "Customer name", type: "text", required: true, primary: true },
      { name: "phone", label: "Phone / WhatsApp", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "product", label: "Product / cart summary", type: "textarea" },
      { name: "amount", label: "Cart total (৳)", type: "number" },
      { name: "stage", label: "Stage", type: "select", options: [
        { value: "abandoned", label: "Abandoned" },
        { value: "reminded", label: "Reminder sent" },
        { value: "recovered", label: "Recovered" },
        { value: "lost", label: "Lost" },
      ] },
      { name: "note", label: "Internal note", type: "textarea" },
    ],
  },
  "quick-sale": {
    kind: "quick_sale",
    mode: "list",
    description: "POS-style instant sale records — manually log in-person / phone orders.",
    fields: [
      { name: "customer", label: "Customer name", type: "text", required: true, primary: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "product", label: "Product", type: "text" },
      { name: "quantity", label: "Quantity", type: "number", min: 1 },
      { name: "amount", label: "Amount (৳)", type: "number", required: true },
      { name: "payment_method", label: "Payment method", type: "select", options: [
        { value: "cash", label: "Cash" },
        { value: "bkash", label: "bKash" },
        { value: "nagad", label: "Nagad" },
        { value: "rocket", label: "Rocket" },
        { value: "bank", label: "Bank transfer" },
      ] },
      { name: "status", label: "Status", type: "select", options: [
        { value: "paid", label: "Paid" },
        { value: "pending", label: "Pending" },
        { value: "refunded", label: "Refunded" },
      ] },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  "payment-links": {
    kind: "payment_link",
    mode: "list",
    description: "Shareable checkout links — send to customers via WhatsApp/SMS.",
    fields: [
      { name: "title", label: "Title / what is it for", type: "text", required: true, primary: true },
      { name: "slug", label: "Slug (auto)", type: "text", autoFrom: "title", autoTransform: "slug" },
      { name: "amount", label: "Amount (৳)", type: "number", required: true },
      { name: "currency", label: "Currency", type: "text", placeholder: "BDT" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "redirect_url", label: "Success redirect URL", type: "url" },
      { name: "expires_at", label: "Expires at", type: "date" },
      { name: "single_use", label: "Single use", type: "boolean" },
    ],
  },
  "invoice-generator": {
    kind: "invoice",
    mode: "list",
    description: "Manually create invoices for customers.",
    fields: [
      { name: "invoice_no", label: "Invoice no.", type: "text", required: true, primary: true },
      { name: "customer", label: "Customer name", type: "text", required: true },
      { name: "phone", label: "Customer phone", type: "text" },
      { name: "email", label: "Customer email", type: "text" },
      { name: "items", label: "Items (one per line: name x qty @ price)", type: "textarea" },
      { name: "subtotal", label: "Subtotal (৳)", type: "number" },
      { name: "discount", label: "Discount (৳)", type: "number" },
      { name: "total", label: "Total (৳)", type: "number", required: true },
      { name: "status", label: "Status", type: "select", options: [
        { value: "draft", label: "Draft" },
        { value: "sent", label: "Sent" },
        { value: "paid", label: "Paid" },
        { value: "overdue", label: "Overdue" },
      ] },
      { name: "due_date", label: "Due date", type: "date" },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  "invoice-design": {
    kind: "invoice_design",
    mode: "single",
    description: "Customize invoice template look & feel.",
    fields: [
      { name: "company_name", label: "Company name", type: "text" },
      { name: "logo_url", label: "Logo", type: "image" },
      { name: "address", label: "Address", type: "textarea" },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "primary_color", label: "Primary color", type: "color" },
      { name: "accent_color", label: "Accent color", type: "color" },
      { name: "show_logo", label: "Show logo", type: "boolean" },
      { name: "show_signature", label: "Show signature area", type: "boolean" },
      { name: "footer_note", label: "Footer note / terms", type: "textarea" },
      { name: "thank_you_text", label: "Thank-you message", type: "text" },
    ],
  },
  "bkash-pgw": {
    kind: "bkash_pgw",
    mode: "single",
    description: "bKash Payment Gateway credentials. Leave disabled until you receive merchant credentials from bKash.",
    fields: [
      { name: "enabled", label: "Enabled", type: "boolean" },
      { name: "environment", label: "Environment", type: "select", options: [
        { value: "sandbox", label: "Sandbox (test)" },
        { value: "live", label: "Live (production)" },
      ] },
      { name: "app_key", label: "App Key", type: "text" },
      { name: "app_secret", label: "App Secret", type: "text" },
      { name: "username", label: "Username", type: "text" },
      { name: "password", label: "Password", type: "text" },
      { name: "merchant_number", label: "Merchant number", type: "text" },
      { name: "callback_url", label: "Callback URL", type: "url" },
    ],
  },
  "bkash-transactions": {
    kind: "bkash_transaction",
    mode: "list",
    description: "bKash transaction log — manual entry or PGW callbacks.",
    fields: [
      { name: "trx_id", label: "Transaction ID", type: "text", required: true, primary: true },
      { name: "customer", label: "Customer", type: "text" },
      { name: "phone", label: "bKash number", type: "text" },
      { name: "amount", label: "Amount (৳)", type: "number", required: true },
      { name: "type", label: "Type", type: "select", options: [
        { value: "payment", label: "Payment" },
        { value: "refund", label: "Refund" },
        { value: "topup", label: "Top-up" },
      ] },
      { name: "status", label: "Status", type: "select", options: [
        { value: "success", label: "Success" },
        { value: "pending", label: "Pending" },
        { value: "failed", label: "Failed" },
      ] },
      { name: "order_ref", label: "Order ref", type: "text" },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  "license-manager": {
    kind: "license_key",
    mode: "list",
    description: "License key inventory — add stock of keys ready to deliver to customers.",
    fields: [
      { name: "product", label: "Product", type: "text", required: true, primary: true },
      { name: "license_key", label: "License key", type: "text", required: true },
      { name: "duration", label: "Duration / validity", type: "text", placeholder: "1 year / lifetime" },
      { name: "platform", label: "Platform", type: "select", options: [
        { value: "windows", label: "Windows" },
        { value: "mac", label: "macOS" },
        { value: "android", label: "Android" },
        { value: "ios", label: "iOS" },
        { value: "cross", label: "Cross-platform" },
      ] },
      { name: "status", label: "Status", type: "select", options: [
        { value: "available", label: "Available" },
        { value: "reserved", label: "Reserved" },
        { value: "sold", label: "Sold" },
        { value: "expired", label: "Expired" },
      ] },
      { name: "cost", label: "Cost price (৳)", type: "number" },
      { name: "supplier", label: "Supplier", type: "text" },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
  "customer-licenses": {
    kind: "customer_license",
    mode: "list",
    description: "Licenses delivered to specific customers.",
    fields: [
      { name: "customer", label: "Customer name", type: "text", required: true, primary: true },
      { name: "email", label: "Customer email", type: "text" },
      { name: "phone", label: "Customer phone", type: "text" },
      { name: "product", label: "Product", type: "text" },
      { name: "license_key", label: "License key", type: "text" },
      { name: "order_ref", label: "Order ref", type: "text" },
      { name: "delivered_at", label: "Delivered at", type: "date" },
      { name: "expires_at", label: "Expires at", type: "date" },
      { name: "status", label: "Status", type: "select", options: [
        { value: "active", label: "Active" },
        { value: "expired", label: "Expired" },
        { value: "revoked", label: "Revoked" },
      ] },
      { name: "note", label: "Note", type: "textarea" },
    ],
  },
};

export function getFeatureConfig(slug: string): AdminFeatureConfig | undefined {
  return FEATURES[slug];
}
