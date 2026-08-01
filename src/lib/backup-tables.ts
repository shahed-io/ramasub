/**
 * Shared (client-safe) backup configuration.
 * Order matters for restore: parents first, children after, so foreign keys
 * never break during a "smart" duplicate-safe restore.
 */
export const BACKUP_TABLES: Record<string, string> = {
  // --- core / parents ---
  profiles: "id",
  products: "slug",
  admin_records: "admin_records",
  user_roles: "id",
  team_members: "id",
  // --- catalogue & marketing ---
  coupons: "id",
  promotions: "id",
  offer_campaigns: "id",
  offer_submissions: "id",
  product_reviews: "id",
  site_pages: "id",
  redirects: "id",
  // --- commerce ---
  orders: "id",
  abandoned_checkouts: "id",
  wallets: "user_id",
  wallet_topups: "id",
  wallet_transactions: "id",
  renewal_reminders_sent: "id",
  // --- support ---
  support_tickets: "id",
  ticket_messages: "id",
  live_chat_messages: "id",
  notifications: "id",
  // --- marketing automation ---
  newsletter_subscribers: "id",
  suppressed_emails: "id",
  email_send_state: "id",
  // --- integrations ---
  telegram_settings: "id",
  telegram_customer_links: "id",
  tracking_pixels: "id",
  meta_business_config: "id",
  meta_standard_events: "event_name",
  meta_custom_events: "id",
  meta_advanced_matching: "id",
  // --- system ---
  activity_logs: "id",
  accessibility_reports: "id",
};

// admin_records PK fix (kept explicit to avoid typos above)
BACKUP_TABLES.admin_records = "id";

export const BACKUP_TABLE_ORDER = Object.keys(BACKUP_TABLES);

/** Storage buckets whose files are included in a Complete Website Backup. */
export const BACKUP_BUCKETS = ["admin-uploads", "payment-screenshots"] as const;

export type BackupPayload = {
  meta: {
    version: number;
    created_at: string;
    created_by?: string;
    total_rows: number;
    counts: Record<string, number>;
  };
  tables: Record<string, Array<Record<string, unknown>>>;
};

/** Nice file name for a single-table JSON export. */
export function tableFileName(table: string) {
  return `${table}.json`;
}
