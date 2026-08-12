# Plan: Premium Underline Checkout Inputs

Redesign all checkout form inputs to use a premium, borderless underline style as requested.

## User Review Required

> [!IMPORTANT]
> This change applies specifically to the Checkout page to maintain a premium feel. Do you want this style to also be applied to other forms like Login/Signup or Profile settings?

- **Visual Style**: Removes boxed/rectangular backgrounds and borders.
- **Focus States**: Only the bottom underline transitions to the brand purple color (#7c3aed).
- **Labels/Icons**: Clean natural placement above/beside the underline.

## Proposed Changes

### UI Components

#### [src/components/checkout/PillField.tsx]
- Remove `rounded-2xl border bg-white shadow-sm` and related focus-within ring styles.
- Add `border-b-2 border-slate-200` as the base style.
- Change focus state to `border-primary` (brand purple) with transition.
- Remove padding and fixed height that creates a "box" look.
- Style the label to be clean, uppercase, and small.
- Ensure the icon sits naturally to the left without its own container.

#### [src/components/checkout/PaymentInstructions.tsx]
- Apply the same underline styling to "Sender Number" and "Transaction ID" fields.
- Remove the `bg-background/50 backdrop-blur-sm rounded-2xl border` wrappers.

#### [src/components/checkout/OrderSummary.tsx]
- Redesign the "Promo Code" input to match the underline style.
- Remove the gray background and boxed border.

### Validation

- Verify that all fields (Name, Email, Phone, TrxID, Coupon) still function correctly.
- Ensure the design is responsive across all mobile viewports mentioned.

