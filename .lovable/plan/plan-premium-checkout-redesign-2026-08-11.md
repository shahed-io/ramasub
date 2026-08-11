# Plan: Premium Checkout Redesign

Redesign the checkout page into a high-end, two-column, professional e-commerce experience while preserving all existing logic.

## User Review Required

> [!IMPORTANT]
> - The existing checkout uses a 2-step flow (Information -> Payment). The request asks for a two-column desktop layout. I will unify these into a single-page view on desktop (with clear sections) or a high-end multi-step wizard if more appropriate for the data density.
> - I will keep BDT as the primary display currency while ensuring the USD rate logic remains functional.

## Proposed Changes

### Styling & Infrastructure
- Update `src/styles.css` with additional utility classes if needed for glassmorphism and soft shadows.
- Add premium checkout-specific components in a new directory or within the route for better modularity.

### Checkout Route (`src/routes/checkout.tsx`)
- **Layout**: Implement a two-column desktop layout.
  - **Left Column**: Forms for User Info, Billing (if applicable), and Payment Method selection.
  - **Right Column**: Sticky "Order Summary" card with product details, breakdown, and CTA.
- **Progress Indicator**: Add a "Cart -> Checkout -> Payment -> Complete" bar at the top.
- **Form Fields**: Rebuild `PillField` and other inputs with rounded corners, clear labels, and better focus/error states.
- **Payment Methods**: Redesign the selection cards with icons, name, and clear "active" state.
- **Trust Indicators**: Add subtle security badges and text (Secure Checkout, Encrypted).
- **Mobile Optimization**: Stack columns vertically, ensure touch-friendly buttons, and potentially use a collapsible summary.
- **Success State**: Redesign the post-order view with high-end animations and clear details.

### Security & UX
- Preserve all existing auth logic (login requirement, guest capture).
- Preserve abandoned checkout capture logic.
- Ensure loading states (coupons, processing) use elegant skeleton or spinner components.

## Technical Details
- **CSS**: Using Tailwind CSS v4 variables and utility classes.
- **Components**: Using Lucide icons for visual consistency.
- **Logic**: No changes to `createServerFn` or Supabase interactions.
