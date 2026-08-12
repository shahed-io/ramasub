# Audit & Repair Plan - Rama Sub

Perform a comprehensive system-wide audit of the admin panel and public APIs, identifying and fixing security, performance, and reliability issues.

## 1. Security Audit & Hardening
- **Telegram Webhook Security:** `customer-webhook.ts` uses a `safeEqual` helper but might be vulnerable to timing attacks if not used correctly. Verify `customer_webhook_secret` is enforced and rotate if exposed.
- **Payment Callbacks:** Ensure `orderId` and `paymentID` are strictly validated in bKash, SSLCommerz, and EPS routes.
- **MFA Enforcement:** Verify all sensitive admin routes (`Mahbub214.*`) are gated by `AdminMfaGate`.
- **Zod Validation:** Audit all `createServerFn` and API routes to ensure they use `src/lib/validation.ts` for strict input parsing.
- **RLS Policies:** Check that all new tables (e.g., `telegram_bot_sessions`, `bot_challenges`) have proper RLS policies and `GRANT` statements.

## 2. Performance & Reliability
- **Media Optimization:** Verify `migrateAllToWebp` in `Mahbub214.products.tsx` covers all media types and handles errors gracefully.
- **Rate Limiting:** Ensure `support-chat.ts` and other public endpoints have appropriate rate limit keys in the `rate_limit_rules` table.
- **Inventory Logic:** Audit `InventoryPage` for race conditions during stock updates.
- **Broken Links/Images:** Scan for dead links in the admin menu and missing icons.

## 3. UI/UX Polishing
- **Contrast Check:** Ensure all text in the admin panel and checkout page meets accessibility standards (Slate 950/Black for visibility).
- **Mobile Responsiveness:** Audit the new premium checkout and admin dashboard on mobile viewports.

## Technical Details
- **Files to Audit:**
  - `src/routes/api/public/telegram/customer-webhook.ts`
  - `src/routes/api/public/support-chat.ts`
  - `src/lib/rate-limit.server.ts`
  - `src/lib/bot-shield.server.ts`
  - `src/routes/Mahbub214.tsx`
  - `src/components/admin/AdminMfaGate.tsx`
- **Database:** Audit `public` schema grants and RLS via `supabase--read_query`.
- **Tools:** Use `supabase--linter` and `playwright` for automated scanning.
