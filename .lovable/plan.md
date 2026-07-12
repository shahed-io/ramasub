# Meta Business Integration — Build Plan

এটা অনেক বড় একটা module (18+ section, wizard, live logs, retry queue, encryption, backup/import ইত্যাদি)। এক turn-এ সব করা quality-নষ্ট হবে, তাই আমি এটাকে **৫টি phase-এ** ভাগ করে build করবো। প্রতিটা phase আলাদা ভাবে usable এবং পরের phase-এর ভিত্তি।

বর্তমান system: `/Mahbub214/fb-pixel` route generic `$page.tsx`-এ render হয় এবং শুধু `pixel_id / access_token / test_event_code` capture করে। `tracking_pixels` টেবিল + `fb-capi-event.functions.ts` + `TrackingScripts.tsx` আছে। আমরা এটাকে একটা পূর্ণ module-এ রূপান্তর করবো।

---

## Phase 1 — Foundation & Settings (এই turn-এ)

**নতুন route:** `Mahbub214.meta-business.tsx` (Marketing group-এ menu entry)

**DB:** নতুন migration
- `meta_business_config` (singleton row) — pixel_id, dataset_id, access_token (encrypted), test_event_code, graph_api_version, all Section-2 toggles (enable_pixel, auto_inject, load_in_head, load_after_consent, advanced_matching, auto_pageview, spa_nav, wc_detect, debug), capi_enabled, capi_endpoint, capi_timeout_ms, capi_max_retry
- `meta_advanced_matching_fields` — jsonb config (email/phone/fn/ln/ct/country/zip/st/external_id/client_ip/user_agent/fbc/fbp — each with enabled bool)
- `meta_standard_events` — event_name, enabled, browser, server, dedupe, priority
- `meta_custom_events` — id, name, trigger_type, trigger_value (url/css/js), browser, server, params jsonb
- `meta_event_logs` — timestamp, event_name, channel(browser|server), http_code, latency_ms, response, retry_count, order_id, customer_id, status
- `meta_capi_queue` — pending/failed events for retry
- RLS: admin-only via `has_role`

**Encryption:** Access token স্টোর হবে server-side `pgp_sym_encrypt` দিয়ে; শুধুমাত্র server function decrypt করতে পারবে। Frontend কখনো token পাবে না।

**Section 1 (Settings) + Section 2 (Pixel Installation) + Section 14 (Verify Connection):**
- Form UI with inline field-level docs ("কোথায় পাবেন / example / errors")
- "Verify Connection" server function — Meta Graph API-তে pixel/dataset/token validate করে
- "Send Test Event" button — PageView পাঠায় test_event_code সহ

**Dashboard cards** (Section top): Connection, Pixel, CAPI, Test Events, Last Event, EMQ, Dataset, Token, API version, Diagnostics — প্রথম version-এ real values (Meta API poll) + placeholder for future.

---

## Phase 2 — Events (Sections 4, 5, 6, 7, 8)

- Advanced Matching config editor (SHA-256 hashing automatic on server before send)
- Standard Events table — 20+ Meta standard events; per-event toggles (enable/browser/server/dedupe/priority)
- Custom Events builder — trigger type (URL match / button click / CSS selector / JS event), parameter mapping
- Event Parameters library (site-wide reusable params)
- Event Mapping presets — auto-wire Order→Purchase, Cart→AddToCart, etc.
- Update `TrackingScripts.tsx` + `fb-capi-event.functions.ts` to read config from DB (no hardcoding)
- Dedupe via `event_id` shared between browser & server

---

## Phase 3 — Runtime Engine (Sections 3, 9, 18)

- CAPI worker server function (cron/on-demand) — process `meta_capi_queue`, retry with backoff, move to DLQ after max retry
- Ecommerce auto-detection: hook into existing checkout/order flow (`orders` table trigger → enqueue Purchase; product page → ViewContent; etc.)
- Refund / cancel / subscription renewal event emission
- SHA-256 hash utility (server-only) for advanced matching
- Async browser injection (already non-blocking) — verify no CLS impact

---

## Phase 4 — Observability (Sections 10, 11, 12)

- **Diagnostics** page — reads `meta_event_logs` + last verify result; shows specific error categories with fix suggestions
- **Test Events** page — dropdown to fire any Standard/Custom event with sample payload
- **Live Logs** — realtime subscription to `meta_event_logs`, filterable table with columns as spec'd

---

## Phase 5 — UX Polish (Sections 13, 15, 16, 19)

- **Connection Wizard** — 10-step guided flow (component `MetaConnectionWizard.tsx`) with per-step validation
- **Consent Management** — Cookie banner integration, GDPR/CCPA region detect, delay-until-consent
- **Backup / Export / Import / Reset** JSON of full config
- **Future-ready hooks**: config schema supports `pixels[]` array (v2 schema kept singleton for now but structured to expand)

---

## Technical Details

**Files created:**
- `supabase/migrations/*_meta_business.sql` — schema
- `src/routes/Mahbub214.meta-business.tsx` — main admin page (tabs: Overview / Settings / Pixel / CAPI / Events / Custom / Params / Diagnostics / Test / Logs / Wizard / Backup)
- `src/lib/meta-business.functions.ts` — server functions (getConfig, saveConfig, verifyConnection, sendTestEvent, listLogs, queueEvent, processQueue)
- `src/lib/meta-business.server.ts` — encryption helpers, Graph API client, SHA-256 hashing, sibling-helper-safe pattern
- `src/lib/meta-events-catalog.ts` — Standard Events + Parameter presets
- `src/components/admin/meta/*` — Section components (Dashboard, SettingsForm, PixelInstall, CapiConfig, EventsTable, CustomEventBuilder, DiagnosticsPanel, LiveLogs, Wizard, BackupPanel)
- Admin menu: replace current `Facebook Pixel` entry with `Meta Business` under Marketing group

**Files removed:** existing `/Mahbub214/fb-pixel` redirect entry + fb-pixel field in `admin-fields.ts` (superseded)

**Security:**
- Access token stored as `pgp_sym_encrypt(token, current_setting('app.settings.meta_key'))` — server-only decrypt
- All admin routes gated by `has_role(auth.uid(), 'admin')`
- Server functions use `requireSupabaseAuth` + admin role check
- SHA-256 all PII before Meta send; never log raw PII
- Rate limit on verify/test buttons (client-side debounce + server-side timestamp check)

**Compatibility:** Uses existing `tracking_pixels` table only for legacy read; new `meta_business_config` becomes source of truth. `TrackingScripts.tsx` migrates to read new config.

---

## Confirmation Needed

Phase 1 এই turn-এ ship করবো — Foundation + Settings form + Verify Connection + Test Event + Dashboard cards + admin menu entry। এটাই পুরো system-এর ভিত্তি এবং একে independently useful। Phase 2-5 পরের turn-গুলোতে আলাদা approve-এ যাবে।

**"OK Phase 1 করো" বললেই start করছি।**