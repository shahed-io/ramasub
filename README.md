# Rama Sub

# Design System Inspired by SubTrendz

## 1. Visual Theme & Atmosphere

SubTrendz is a vibrant, energetic e-commerce platform for digital products designed to feel modern, trustworthy, and action-oriented. The visual identity combines bold purple accents with a clean, minimal neutral foundation, creating a sense of premium quality and approachability. The design emphasizes confidence through vivid primary colors, smooth interactive feedback, and generous spacing that feels both spacious and purposeful. The atmosphere is youthful yet professional, designed to inspire users to explore and purchase software subscriptions with ease. Rounded elements and vibrant gradients create a friendly, forward-thinking aesthetic that positions SubTrendz as a contemporary leader in digital product sales.

**Key Characteristics**

- Bold, saturated primary purple (`#8703F9`) as the dominant brand color

- Clean white and neutral grayscale backgrounds for clarity and focus

- Rounded button and input components suggesting approachability and modernity

- Generous padding and vertical spacing creating breathing room and visual hierarchy

- High contrast between text and backgrounds for accessibility and readability

- Smooth elevation shadows for subtle depth without clutter

- Vibrant accent colors for category markers and promotional areas

- Mobile-first, responsive layout with touch-friendly interactive targets

## 2. Color Palette & Roles

### Primary

- **Brand Purple** (`#8703F9`): Primary call-to-action buttons, search buttons, category highlights, and key interactive elements; conveys energy and trust

- **Brand Purple Dark** (`#6A2560`): Secondary brand tone used in promotional gradients and layered backgrounds

### Accent Colors

- **Coral Pink** (`#F78DA7`): Subtle accent for highlights and supporting visual emphasis

- **Orange** (`#FF6900`): Attention-grabbing secondary action or featured promotions

- **Teal Green** (`#7BDCB5`): Used in product category tiles (ChatGPT Plus, educational products) for visual variety and brand extension

- **Cyan Blue** (`#233647`): Navigation and premium product highlights (LinkedIn Premium)

### Interactive

- **Primary Button** (`#8703F9`): Primary CTAs and interactive buttons with white text

- **Secondary Interactive** (`#767676`): Secondary text links and subtle interactive states

- **Hover/Focus State**: Retain primary color with increased opacity or slight darkening (inferred: `rgba(135, 3, 249, 0.85)`)

### Neutral Scale

- **Black** (`#000000`): Primary text, headings, and high-contrast body copy (dominant usage)

- **Dark Gray** (`#333333`): Secondary headings and subtext

- **Medium Gray** (`#838383`): Placeholder text, disabled states, and tertiary information

- **Light Gray** (`#767676`): Border strokes, dividers, and subtle background tints

- **Very Dark Gray** (`#242424`): Alternative dark backgrounds for contrast

- **Off-Black** (`#111111`): Deep shadows and extreme contrast scenarios

- **Charcoal** (`#3E3E3E`): Alternative neutral for cards or container backgrounds

### Surface & Borders

- **White** (`#FFFFFF`): Primary surface color for cards, inputs, modals, and light backgrounds

- **Border Gray** (`#FFFFFF` with `rgba(0, 0, 0, 0.1)` stroke): Input borders and subtle dividers

- **Light Background** (`#ABB8C3`): Soft background tints for secondary surfaces (infrequent usage)

### Semantic / Status

- **Error/Danger** (`#CB2027`): Error states, validation failures, and destructive actions

- **Error Alt** (`#FF3B3B`): Alternative error messaging and alert highlights

- **Error Dark** (`#CF2E2E`): Deep error states for emphasis

- **Warning** (`#FCB900`): Warning messages, cautions, and attention states

## 3. Typography Rules

### Font Family

**Primary: Lexend Deca** (Google Fonts)

Fallback stack: `Lexend Deca, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Secondary: Poppins** (Google Fonts)

Fallback stack: `Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Tertiary / Body: Open Sans** (Google Fonts)

Fallback stack: `Open Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |

|------|------|------|--------|-------------|-----------------|-------|

| Display / Hero | Poppins | 34px | 500 | 47.6px | 0px | Large headings; used for main page title or banner headlines |

| Heading 2 / Section Title | Lexend Deca | 26px | 500 | 36.4px | 0px | Major section headings; strong visual anchor |

| Heading 3 / Card Title | Lexend Deca | 14px | 600 | 19.6px | 0px | Category labels and card titles; elevated weight for hierarchy |

| Body Text | Open Sans | 14px | 400 | 22.4px | 0px | Primary reading text; paragraphs and descriptions |

| Body Emphasized / Label | Open Sans | 14px | 600 | 22.4px | 0px | Button labels, form labels, and emphasized text |

| Button Text | Open Sans | 13px | 600 | 15.6px | 0px | CTA button labels; slightly smaller than body for compact feel |

| Caption / Meta | Open Sans | 12px | 400 | 18px | 0px | Timestamps, metadata, and secondary information (inferred) |

| Code / Monospace | Courier New | 12px | 400 | 18px | 0px | Product codes or technical reference (inferred) |

### Principles

- **Contrast for hierarchy**: Use weight variation (400 → 600) to establish information priority without size bloat

- **Consistent line heights**: Maintain `1.6x` font size ratio for readability across all roles

- **Moderate sizing**: Cap display sizes at `34px` to avoid overwhelming layouts on smaller screens

- **Font pairing logic**: Lexend Deca (geometric, modern) for headings; Open Sans (humanist, readable) for body text

- **Weight discipline**: Restrict to weights 400 (regular) and 600 (bold); avoid light or black weights

- **Accessibility**: Ensure minimum 14px for body text; maintain 4.5:1 color contrast on all text

## 4. Component Stylings

### Buttons

**Primary Button**

- Background Color: `#8703F9`

- Text Color: `#FFFFFF`

- Font: Open Sans, 13px, weight 600

- Padding: `5px 20px`

- Border Radius: `5px`

- Height: `42px`

- Line Height: `15.6px`

- Border: `0px solid transparent`

- Box Shadow: `none`

- Hover State: Background `rgba(135, 3, 249, 0.85)`; slight lift effect with `rgba(0, 0, 0, 0.15) 0px 0px 3px 0px`

- Active State: Background `#6A2560`; inset shadow `rgba(0, 0, 0, 0.15) 0px -2px 0px 0px inset`

**Primary Icon Button (Large Rounded)**

- Background Color: `#8703F9`

- Text Color: `#FFFFFF`

- Border Radius: `35px`

- Height: `38px`

- Width: `38px`

- Padding: `0px`

- Font Size: `0px` (icon-only; use CSS `display: flex; align-items: center; justify-content: center;`)

- Box Shadow: `none`

- Hover State: Background `rgba(135, 3, 249, 0.85)`

**Secondary Icon Button (Small Rounded)**

- Background Color: `#8703F9`

- Text Color: `#FFFFFF`

- Border Radius: `35px`

- Height: `auto`

- Width: `34px`

- Padding: `0px`

- Box Shadow: `none`

- Hover State: Background `rgba(135, 3, 249, 0.85)`

**Ghost Button / Text Link**

- Background Color: `transparent`

- Text Color: `#333333`

- Font: Open Sans, 14px, weight 400

- Padding: `8px 0px`

- Border: `0px none`

- Border Radius: `0px`

- Box Shadow: `none`

- Hover State: Text Color `#8703F9`; underline added via `text-decoration: underline`

- Active State: Text Color `#6A2560`

**All Categories Button (Pill Shape)**

- Background Color: `#8703F9`

- Text Color: `#FFFFFF`

- Font: Open Sans, 14px, weight 600

- Padding: `12px 20px`

- Border Radius: `50px`

- Height: `auto`

- Border: `0px solid transparent`

- Box Shadow: `none`

- Hover State: Background `rgba(135, 3, 249, 0.85)`

### Cards & Containers

**Standard Product Card**

- Background Color: `#FFFFFF`

- Text Color: `#000000`

- Padding: `0px` (images bleed to edges)

- Border Radius: `0px`

- Border: `0px none`

- Box Shadow: `none`

- Internal spacing: `16px` between image and text content

- Title Font: Lexend Deca, 14px, weight 600

- Body Font: Open Sans, 14px, weight 400

- Hover State: Subtle lift with `rgba(0, 0, 0, 0.15) 0px 0px 3px 0px`

**Promo Card (with Gradient Background)**

- Background: Gradient from light purple/blue to cyan (inferred from LinkedIn Premium showcase)

- Text Color: `#000000` or `#FFFFFF` depending on overlay

- Padding: `32px 36px`

- Border Radius: `0px` (full-width banners) or `12px` (contained cards)

- Box Shadow: `none`

- Typography: Display/Heading 2 for main text; body text for CTAs

**Category Tile (Purple Background)**

- Background Color: `#8703F9`

- Text Color: `#FFFFFF`

- Padding: `24px 20px`

- Border Radius: `12px`

- Border: `0px none`

- Box Shadow: `rgba(0, 0, 0, 0.16) 0px 5px 40px 0px` (on hover)

- Icon placement: Top-left or center

- Title Font: Open Sans, 14px, weight 600

- Hover State: Box shadow applied; transform scale `1.02`

**Modal / Elevated Container**

- Background Color: `#FFFFFF`

- Text Color: `#000000`

- Padding: `36px 40px`

- Border Radius: `12px`

- Border: `0px none`

- Box Shadow: `rgba(0, 0, 0, 0.16) 0px 5px 40px 0px`

- Z-index: High (inferred: `1000` or greater)

### Inputs & Forms

**Search Input (Large)**

- Background Color: `#FFFFFF`

- Text Color: `#767676` (placeholder); `#000000` (active)

- Font: Open Sans, 14px, weight 400

- Padding: `0px 233px 0px 15px` (right padding for icon button)

- Border Radius: `35px`

- Height: `46px`

- Width: `100%` (responsive)

- Border: `1px solid rgba(0, 0, 0, 0.1)`

- Line Height: `22.4px`

- Box Shadow: `none`

- Focus State: Border `1px solid #8703F9`; box shadow `0px 0px 0px 2px rgba(135, 3, 249, 0.1)`

**Select / Category Dropdown Input**

- Background Color: `#FFFFFF`

- Text Color: `#767676`

- Font: Open Sans, 14px, weight 400

- Padding: `0px 42px 0px 15px` (right padding for dropdown arrow)

- Border Radius: `35px`

- Height: `42px`

- Width: `100%`

- Border: `1px solid rgba(0, 0, 0, 0.1)`

- Box Shadow: `none` (default); `rgba(0, 0, 0, 0.15) 0px 0px 3px 0px` (open state)

- Focus State: Border `1px solid #8703F9`

**Text Input (Rectangular, Form Field)**

- Background Color: `#FFFFFF`

- Text Color: `#000000`

- Font: Open Sans, 14px, weight 400

- Padding: `0px 15px`

- Border Radius: `5px`

- Height: `42px`

- Width: `100%`

- Border: `1px solid rgba(0, 0, 0, 0.1)`

- Line Height: `22.4px`

- Box Shadow: `none`

- Focus State: Border `1px solid #8703F9`; background `rgba(135, 3, 249, 0.02)`

- Disabled State: Background `#F5F5F5`; text color `#838383`; border `1px solid rgba(0, 0, 0, 0.05)`

- Error State: Border `1px solid #CB2027`; text color `#CB2027`

### Navigation

**Top Navigation Bar**

- Background Color: `#8703F9`

- Text Color: `#FFFFFF`

- Font: Open Sans, 14px, weight 600

- Padding: `0px 10px`

- Height: `40px` (minimum); typically `56px` on desktop

- Border Radius: `0px`

- Border: `0px none`

- Box Shadow: `none`

- Link hover: Text Color `#FFFFFF`; opacity `0.85`

**Navigation Link (Active)**

- Background Color: `transparent` or `rgba(255, 255, 255, 0.2)`

- Text Color: `#FFFFFF`

- Font: Open Sans, 14px, weight 600

- Padding: `4px 20px`

- Border Radius: `10px 10px 0px 0px` (top-rounded tabs) or `10px` (all)

- Height: `45px`

- Box Shadow: `none`

- Border: `0px none`

**Navigation Link (Inactive)**

- Background Color: `transparent`

- Text Color: `#333333` (or `#FFFFFF` on purple background)

- Font: Open Sans, 14px, weight 600

- Padding: `4px 20px`

- Border Radius: `0px`

- Height: `45px`

- Box Shadow: `none`

- Hover State: Text Color `#8703F9`; background `rgba(135, 3, 249, 0.08)`

**Breadcrumb / Secondary Navigation**

- Background Color: `transparent`

- Text Color: `#838383`

- Font: Open Sans, 14px, weight 400

- Padding: `8px 0px`

- Height: `34.1875px`

- Width: `auto`

- Line Height: `18.2px`

- Separator: `/` or `>` in medium gray (`#838383`)

- Link Color: `#767676`

- Link Hover: Color `#8703F9`; underline applied

### Badges & Labels

**Category Badge**

- Background Color: `#8703F9` or semantic color (e.g., `#7BDCB5` for educational)

- Text Color: `#FFFFFF`

- Font: Open Sans, 12px, weight 600

- Padding: `4px 12px`

- Border Radius: `4px`

- Border: `0px none`

- Height: `auto`

- Box Shadow: `none`

**Status Badge (Error)**

- Background Color: `#FF3B3B` or `#CB2027`

- Text Color: `#FFFFFF`

- Font: Open Sans, 12px, weight 600

- Padding: `4px 12px`

- Border Radius: `4px`

- Border: `0px none`

- Box Shadow: `none`

**Status Badge (Warning)**

- Background Color: `#FCB900`

- Text Color: `#000000`

- Font: Open Sans, 12px, weight 600

- Padding: `4px 12px`

- Border Radius: `4px`

- Border: `0px none`

- Box Shadow: `none`

## 5. Layout Principles

### Spacing System

**Base Unit**: `4px`

**Spacing Scale**:

- `4px`: Micro spacing (internal component gaps, button padding variance)

- `8px`: Extra small (minor gaps between related elements)

- `12px`: Small (padding within cards, tight component spacing)

- `16px`: Base unit (default padding for containers, standard component gaps)

- `20px`: Medium (gap between sections, major padding)

- `32px`: Large (section padding, card vertical spacing)

- `36px`: Large+ (container internal padding)

- `40px`: Extra large (page-level margins, hero spacing)

- `52px`: Section separator (vertical gap between major sections)

- `60px`: Major section (vertical gap for distinct content blocks)

- `80px`: Hero section (top/bottom padding for banners)

- `140px`: Maximum breathing room (edge cases, full-width section padding)

**Usage Context**:

- Component internal padding: `12px` to `20px`

- Container padding: `20px` to `40px` (desktop); `16px` on mobile

- Section gap: `40px` to `80px` vertically

- Element margins: `16px` between stacked items

- Grid gap: `20px` between cards

### Grid & Container

**Maximum Container Width**: `1440px` (desktop); full bleed on tablet/mobile

**Column Strategy**: 

- Desktop: 12-column grid with `20px` gutter

- Tablet (768px–1024px): 8-column grid with `16px` gutter

- Mobile (320px–767px): 4-column grid with `12px` gutter or single-column layout

**Section Patterns**:

- Hero banner: Full-width bleed with internal padding `80px 40px`

- Product grid: Variable columns (4 cards on desktop, 2 on tablet, 1 on mobile)

- Navigation area: Full-width bar with `56px` height on desktop, `48px` on mobile

- Sidebar + content: Sidebar `280px` fixed, content `flex: 1`, gap `20px`

**Typical Container Widths**:

- Full-width section: `100%`

- Constrained content: `1200px` centered with `40px` padding left/right

- Card width: `calc(25% - 20px)` (4-column) on desktop; `calc(50% - 10px)` (2-column) on tablet

### Whitespace Philosophy

SubTrendz embraces generous whitespace to communicate premium quality and reduce cognitive load. Rather than cramming elements, the design breathes through:

- Vertical spacing prioritized over horizontal (aim for 1.5–2x more vertical gap between sections)

- Padding hierarchy: container padding > component padding > internal element spacing

- Negative space as a design element, not wasted space

- Breathing room around CTAs to draw focus and reduce decision paralysis

- Tight spacing within cards (12px) vs. loose spacing between cards (20px) to create visual grouping

### Border Radius Scale

- `0px` (sharp): Section dividers, full-width banners, table layouts, large containers

- `4px` (subtle): Badges, small UI elements, form validation indicators

- `5px` (soft): Standard buttons, form inputs (rectangular variants)

- `10px` (rounded): Tab labels, medium buttons, card corners

- `12px` (moderate): Card containers, modal dialogs, product tiles

- `24px` (generous): Form inputs (pill shape), search bars

- `35px` (near-circle): Icon buttons, avatar placeholders

- `50%` (perfect circle): Avatars, circular icon buttons, boolean toggles

## 6. Depth & Elevation

| Level | Treatment | Use |

|-------|-----------|-----|

| Flat (L0) | No shadow; `box-shadow: none` | Base surfaces, main content areas, sections |

| Subtle (L1) | `rgba(0, 0, 0, 0.15) 0px 0px 3px 0px` | Dropdown menus, hover states on clickable elements, slightly raised cards |

| Raised (L2) | `rgba(0, 0, 0, 0.16) 0px 5px 40px 0px` | Modal dialogs, floating action buttons, prominent product cards on hover |

| Inset (L3) | `rgba(0, 0, 0, 0.15) 0px -2px 0px 0px inset` | Pressed button states, form field focus, active navigation items |

**Shadow Philosophy**

SubTrendz uses minimal, subtle shadows that prioritize flat design while maintaining depth hierarchy. Shadows are reserved for elevated components (modals, dropdowns) or interactive feedback (button press). The dominant shadow is a soft ambient shadow (`0px 0px 3px`) that suggests elevation without drama. Larger, more pronounced shadows (`0px 5px 40px`) are used sparingly for modal-level prominence. Inset shadows indicate pressed or active states, providing tactile feedback. Overall philosophy: shadows should be felt, not seen; they support information hierarchy rather than dominate the visual landscape.

## 7. Do's and Don'ts

### Do

- **Use the primary purple (`#8703F9`) for all primary CTAs** to create consistent, recognizable call-to-action patterns across the platform

- **Maintain minimum 14px font size for body text** to ensure readability and accessibility on all devices

- **Apply 20px gap between product cards** to create clear visual grouping and reduce cognitive load

- **Use rounded corners (24px–35px) for inputs and buttons** to reinforce the modern, approachable brand personality

- **Employ generous vertical spacing (40px–80px between sections)** to create breathing room and visual hierarchy

- **Always pair Open Sans with Lexend Deca** to maintain typography consistency and brand recognition

- **Test hover states on all interactive elements** to provide clear visual feedback and confirm clickability

- **Use semantic colors (`#CB2027` for errors, `#FCB900` for warnings)** to communicate status without text alone

- **Include 4.5:1 color contrast minimum** on all text for WCAG AA compliance

- **Layer cards with subtle shadows on hover** to indicate interactivity and raise importance

### Don't

- **Don't use colors outside the established palette** for major UI components; stick to primary, accent, and neutral tones

- **Don't mix button styles on the same page** without clear reason (e.g., primary for main CTA, secondary for supporting action)

- **Don't set font sizes below 12px** for any readable text; use color or opacity for secondary hierarchy instead

- **Don't apply excessive shadows** (L2 shadows only on modals and truly elevated surfaces; use L1 for cards)

- **Don't exceed 32px padding within standard cards** to avoid wasted space and elongated content areas

- **Don't use weights other than 400 and 600** for typography; this breaks hierarchy and dilutes visual consistency

- **Don't place text directly on uncontoured images** without a semi-transparent overlay or text shadow for readability

- **Don't mix border radius scales within a single component family** (e.g., all buttons should be either 5px or 35px, not both)

- **Don't create interactive elements smaller than 44px × 44px** on mobile; respect touch target minimums

- **Don't rely on color alone to communicate status or error** states; pair with icons, text labels, or borders

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |

|------|-------|-------------|

| Mobile | 320px–767px | Single-column layout, 4-column grid, `16px` container padding, `48px` top nav height, `12px` card gap, hamburger menu shown, font sizes reduced 10%, touch targets enlarged to `44px` |

| Tablet | 768px–1023px | 2-column card grid, 8-column layout grid, `20px` container padding, `56px` top nav height, `16px` card gap, navigation menu visible (horizontal), side navigation collapses at lower tablet sizes |

| Desktop | 1024px+ | 4-column card grid, 12-column layout grid, `40px` container padding, full navigation visible, `20px` card gap, `1440px` max container width, sidebar fixed layout enabled |

### Touch Targets

- **Minimum size**: `44px × 44px` for all interactive elements on mobile and tablet

- **Recommended size**: `48px × 48px` for primary CTAs on mobile

- **Spacing between targets**: Minimum `8px` gap to prevent accidental activation

- **Button padding**: Mobile `12px 20px` (min height 44px); desktop `5px 20px` (min height 42px)

- **Icon buttons**: Mobile `48px × 48px`; tablet/desktop `38px × 38px` or larger

- **Input fields**: Mobile `48px` height minimum; desktop `42px–46px`

- **Navigation links**: Mobile `16px` padding left/right, `12px` padding top/bottom (min 44px height)

### Collapsing Strategy

**Navigation**:

- Desktop: Horizontal menu bar with full labels

- Tablet: Horizontal menu bar with abbreviated labels or icons

- Mobile: Hamburger icon expanding vertical menu overlay

**Product Grid**:

- Desktop (1024px+): 4 columns with `20px` gap

- Tablet (768px–1023px): 2 columns with `16px` gap

- Mobile (320px–767px): 1 column, full width minus `16px` padding on each side

**Hero Section**:

- Desktop: Large banner with 50/50 text-to-image ratio, `80px` vertical padding

- Tablet: 60/40 text-to-image, `60px` vertical padding

- Mobile: Full-width stacked text above image, `40px` vertical padding, text spans 100%

**Sidebar + Content**:

- Desktop: Sidebar `280px` fixed left, content `flex: 1`, gap `20px`

- Tablet: Sidebar `200px` fixed left (or collapse to 60px icon-only), content responsive

- Mobile: Sidebar hidden; accessible via hamburger or bottom drawer; content full-width

**Form Layout**:

- Desktop: Columns side-by-side (50/50 or 60/40 split) with `20px` gap

- Tablet: Single column with `100%` width, `16px` gap between fields

- Mobile: Single column, full width minus `12px` padding, `16px` gap between fields

**Card Typography Reduction**:

- Desktop: Heading 26px, body 14px

- Tablet: Heading 22px, body 13px (inferred)

- Mobile: Heading 18px, body 12px (inferred)

**Padding Collapse**:

- Desktop: `40px` container padding

- Tablet: `24px` container padding (inferred)

- Mobile: `16px` container padding

## 9. Agent Prompt Guide

### Quick Color Reference

Use these colors as your primary reference for implementing UI components:

- **Primary CTA**: Brand Purple (`#8703F9`) — use for all primary action buttons, search buttons, and dominant interactive elements

- **Secondary Accent**: Orange (`#FF6900`) — use for promotions, sales badges, and secondary highlights

- **Tertiary Accent**: Teal Green (`#7BDCB5`) — use for category tiles and educational/productivity product cards

- **Text Heading**: Black (`#000000`) — use for all major headings and high-contrast text

- **Text Body**: Black (`#000000`) — use for paragraphs and standard reading text

- **Text Secondary**: Dark Gray (`#333333`) — use for subheadings, captions, and secondary information

- **Text Placeholder**: Medium Gray (`#838383`) — use for form placeholder text and disabled states

- **Text Tertiary**: Light Gray (`#767676`) — use for metadata, timestamps, and lowest-priority text

- **Background**: White (`#FFFFFF`) — use for cards, inputs, modals, and light surfaces

- **Border**: Light Gray with alpha (`rgba(0, 0, 0, 0.1)`) — use for input borders, dividers, and subtle separators

- **Error**: Error Red (`#CB2027`) — use for validation errors, danger actions, and destructive states

- **Warning**: Warning Amber (`#FCB900`) — use for cautions and attention-required messages

- **Surface Elevation**: White (`#FFFFFF`) — use for modals and elevated containers; apply shadow for depth

- **Category Background**: Brand Purple (`#8703F9`) — use for category tiles; apply `#7BDCB5` or `#233647` for variety

### Iteration Guide

Follow these numbered rules when implementing components or extending the design:

1. **Every button must be one of three styles**: Primary (`#8703F9` background, white text), Secondary (white background, `#333333` text), or Ghost (transparent background, colored text); no custom button styles

2. **All text inputs must have `24px` border-radius** and a `1px` border with `rgba(0, 0, 0, 0.1)`; maintain `42px–46px` height

3. **Card spacing is hierarchical**: `12px–16px` internal card padding; `20px` gap between cards; `40px` padding on container

4. **Icon buttons in purple must always be `35px` or larger** and centered using flexbox; use `38px × 38px` as default

5. **All typography must use one of three fonts**: Lexend Deca (headings only), Poppins (display), or Open Sans (body/buttons); no other fonts

6. **Hover states must apply light shadow** (`rgba(0, 0, 0, 0.15) 0px 0px 3px 0px`) or opacity fade; no color shifts unless specifically noted

7. **Mobile layouts collapse to single-column at 768px breakpoint**; use full-width cards with `16px` padding on container

8. **Every form field error must show `#CB2027` border and error text color**; pair with an icon or message

9. **Navigation links on purple background must use white text**; active state can add `rgba(255, 255, 255, 0.2)` background

10. **Shadows are reserved for elevation only**: Flat surfaces use no shadow; modals use `rgba(0, 0, 0, 0.16) 0px 5px 40px 0px`; hover interactions use `rgba(0, 0, 0, 0.15) 0px 0px 3px 0px`

11. **Line height must be 1.6x the font size** (e.g., 14px text → 22.4px line height); do not deviate

12. **Touch targets on mobile must be minimum `44px × 44px`**; primary buttons should reach `48px`

13. **Grid structure**: 12 columns on desktop, 8 on tablet, 4 on mobile; maintain `20px` gutter on desktop, `16px` on tablet, `12px` on mobile

14. **When adding new category colors**, maintain the teal/green and cyan blue accents; limit to 4 total accent colors max

15. **All badges must use `4px` border-radius**; reserve `35px` radius for circular elements only

উপরোক্ত দেওয়া উদাহরণ থেকে আমাদের ওয়েবসাইট তৈরি করবা। আমাদের ওয়েবসাইটের নাম AccessNow BD এটা দিবা

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ramasub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e2352888-ae7a-48ce-968f-674ff8a31d97).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
