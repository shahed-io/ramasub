## Scope reality check

Admin panel = **51 pages, ~25,500 lines**. A single pass that rewrites every page *and* ships full WebAuthn/audit-log/IP-whitelist backends would be unsafe on a live shop. So the work is split into 4 phases, each shippable and non-breaking. Nothing is removed; no schema is dropped; all routes, server functions and permissions stay as-is.

---

## Phase 1 — Global admin design system (biggest visual win, zero page rewrites)

All admin pages already render inside the `.admin-shell` / `.admin-clarity` scope, so one token layer upgrades all 51 pages at once.

- **Color system** (exact spec): primary `#6D28D9`, secondary `#7C3AED`, success `#10B981`, warning `#F59E0B`, danger `#EF4444`, heading `#111827`, body `#6B7280`, hint `#9CA3AF`, page bg `#F9FAFB`, cards white. Existing loud violet gradients get toned down to accents only.
- **Typography scale** enforced by scope: page title 32/700, section 24/700, card title 20/600, body 16/400, description 14/400, hint 13/400, consistent line-heights.
- **Cards**: radius 18px, padding 32px (24px on mobile), 24px gap, soft shadow, subtle hover lift — applied via `.a-card` so every page inherits it.
- **Buttons**: `.a-btn` primary/secondary/ghost/danger with hover, focus-visible ring, disabled, spinner loading and post-save success tick.
- **Forms**: single input height (44px), radius, padding, label/placeholder/hint colors, violet focus ring, inline error style.
- **Badges**: `.a-badge` variants — Enabled/Verified green, Disabled/Failed red, Pending yellow, Not Configured gray — plus mapping of existing status text to badges.
- **Icons**: normalize to Lucide at 16/18/20px sizes inside admin scope (any stray non-Lucide icon gets replaced).
- **Responsive + a11y**: header rows converted to the grid + `min-w-0` + `shrink-0` pattern, no horizontal overflow at 360px, visible focus rings, ARIA labels on all icon-only buttons, 44px tap targets.

## Phase 2 — Page-by-page cleanup pass

Walk all 51 pages in priority order (Dashboard, Orders, Products, Inventory, Payments, Settings, Users/Roles, Telegram, SEO, Backup, then the rest):

- remove duplicate hero/gradient blocks that repeat the page header
- unify stat rows, tables, empty states, action buttons (right-aligned circular icon actions)
- rewrite bloated Bengali/English descriptions into one-line professional copy (e.g. "Master switch for the entire admin 2FA system…" → "Enable or disable two-factor authentication for all administrators.")
- skeleton loaders in place of bare "Loading…", memoized lists to cut re-renders

## Phase 3 — Security Center redesign (frontend + existing data)

`/Mahbub214/security` rebuilt as a tabbed Security Center:

- **Security Score** card (0–100) with checklist: strong password, 2FA enabled, passkey added, recovery codes saved, verified email, trusted device, recent login reviewed
- **Authentication** — password, TOTP (Google/Microsoft Authenticator, Authy), passkeys, security keys
- **Recovery** — recovery codes (generate / download / print / copy), backup email, backup phone
- **Sessions** — current session, all active sessions, logout other devices, remember device, expiry + idle timeout
- **Trusted Devices** — device, browser, OS, location, last used, remove
- **Login History** — time, country, city, browser, OS, IP, success/failed
- **Policies** — login notifications, new-device alerts, suspicious login detection, country restrictions, IP whitelist, force re-auth, password confirm for sensitive actions

Anything without a backend yet renders as a real card in a "Not configured" state — never a fake toggle.

## Phase 4 — Advanced security backend

New tables (additive only, RLS + GRANTs, admin-scoped): `admin_passkeys`, `admin_recovery_codes` (hashed), `admin_trusted_devices`, `admin_login_history`, `admin_audit_logs`, `admin_security_policies`.

Server-side work: WebAuthn register/verify server functions, recovery-code hash + single-use redemption, login-history + audit-log writers, trusted-device fingerprints, login rate limiting / brute-force lockout, IP + country checks, session rotation, idle auto-logout, security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, nosniff) and secure cookie flags in the request middleware. CSRF/XSS/SQL-injection posture: same-origin server functions + parameterized Supabase queries already cover the base; the gap I'll close is output sanitization on any `dangerouslySetInnerHTML` and strict Zod validation on every admin mutation input.

---

## Technical notes

- Design tokens go in `src/styles.css` (Tailwind v4 `@theme` + `@utility`) scoped to the admin shell, so the public storefront theme is untouched.
- Shared React pieces: `AdminCard`, `AdminBadge`, `AdminButton`, `AdminField`, `AdminSkeleton` under `src/components/admin/` — pages migrate to them incrementally.
- Every phase is verified in a headless browser at 1440 / 1024 / 768 / 390 px before I report done.

## Suggested order

Phase 1 first (immediate site-wide effect), then Phase 3 (the Security Center you described in most detail), then Phase 2, then Phase 4. Tell me if you want a different order — or reply "start" and I'll begin with Phase 1.