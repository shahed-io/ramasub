# Audit and Repair Plan - Rama Sub

Perform a comprehensive system-wide audit and repair identified security, performance, and UI issues.

## Audit Findings

### Security
1. **Server-side MFA Enforcement**: While `assertAdminMfaGrant` exists, it needs to be consistently applied to all privileged server functions that currently only check for the 'admin' role.
2. **Webhook Verification**: Telegram and payment webhooks must use timing-safe comparison for secrets (implemented in part, but needs verification across all callback handlers).
3. **Input Validation**: Ensure every server function uses the strict Zod schemas defined in `src/lib/validation.ts`.
4. **Rate Limiting**: Public routes like `createOrder` and `support-chat` should have appropriate rate limits to prevent brute-force or spam.

### Performance
1. **Database Queries**: Several admin pages (e.g., Dashboard, Customers) perform large `select("*")` queries. These should be narrowed to required fields and paginated where possible.
2. **Client-side Fetching**: Move direct `supabase.from(...)` calls in components to server functions to improve SSR performance and security.

### User Interface
1. **Contrast & Readability**: Standardize high-contrast colors (Slate 950 for text, White for backgrounds) across FAQ and Checkout components.
2. **Consistent Branding**: Ensure all premium components use the "Clarity" theme (24px radius, soft violet shadows).

## Implementation Steps

### Phase 1: Security Hardening
1. **Consolidate Admin Checks**: Update `assertAdmin` helpers in all `*.functions.ts` files to include `assertAdminMfaGrant(context.userId)`.
    - Affected: `customers.functions.ts`, `wallet.functions.ts`, `software-downloads.functions.ts`, `search-console.functions.ts`.
2. **Secure Webhooks**:
    - Update `src/routes/api/public/telegram/customer-webhook.ts` to use `crypto.timingSafeEqual`.
    - Audit payment callbacks (`bkash/callback.ts`, `sslcommerz/callback.ts`, `eps/callback.ts`) for potential client-spoofing gaps.
3. **Enforce Zod Validation**:
    - Ensure `src/routes/api/public/support-chat.ts` and `orders.functions.ts` use `validator()` wrappers from `src/lib/validation.ts`.

### Phase 2: Performance & Data Fetching
1. **Migrate Admin Queries**:
    - Convert `src/routes/Mahbub214.orders.tsx` and `src/routes/Mahbub214.index.tsx` to use server functions for data loading.
    - Implement pagination for `listCustomers` in `src/lib/customers.functions.ts`.
2. **Optimize Media**:
    - Ensure `ProductCard.tsx` and `product.$slug.tsx` use the `optimizeSupabaseImage` utility for all media.

### Phase 3: UI/UX Refinement
1. **FAQ & Support Readability**:
    - Set FAQ answers to `text-black` and `font-medium` in `src/routes/faq.tsx` and `src/components/SupportWidget.tsx`.
2. **Checkout Final Polish**:
    - Standardize underline input contrast in `src/styles.css` using Slate 950 for input text.

## Technical Details
- **MFA Check**: `await (await import("@/lib/admin-mfa-guard.server")).assertAdminMfaGrant(context.userId)`
- **Timing Safe Equal**: `const { timingSafeEqual } = require("crypto"); ... timingSafeEqual(Buffer.from(a), Buffer.from(b))`
- **Zod Validation**: Use `.strict()` on all object schemas to reject unknown keys.
