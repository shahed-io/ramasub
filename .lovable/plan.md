## লক্ষ্য
Google Form-এর বদলে নিজস্ব domain-এ custom offer/giveaway form system — সম্পূর্ণ admin-controlled, সাথে AI-powered automatic winner selection।

## Scope

### 1. Database (migration)
- `offer_campaigns` — title, slug, description, cover_image, status (draft/active/ended), starts_at, ends_at, winner_count, prizes (jsonb array), fields_schema (jsonb — custom form fields), success_message, redirect_url, google_form_url (optional fallback link)
- `offer_submissions` — campaign_id, user_id (nullable), name, email, phone, answers (jsonb), ip, user_agent, is_winner, winner_rank, created_at
- `offer_winners` — campaign_id, submission_id, prize, selected_at, selection_method (ai/random/manual), notes
- RLS: anyone INSERT submissions (with rate-limit checks); admin full control; users see own submissions

### 2. Admin Panel (`/admin/offers`)
- List view: all campaigns with status pills, submission counts, winner status
- Create/Edit campaign: 
  - Basic info (title, slug, dates, cover image)
  - **Form builder** — drag/add fields (text, email, phone, textarea, select, radio, checkbox, file), mark required
  - Prize configuration: # of winners + prize details per rank
  - Success message + post-submit redirect
  - Optional Google Form URL embed/link
- Submissions tab: searchable table, export CSV, view individual answers
- **Winner Picker** tab:
  - "AI Pick Winners" button → Lovable AI Gateway scores submissions (completeness, validity, engagement) and selects top N
  - "Random Pick" fallback
  - Manual override
  - Mark winners, notify (email integration ready)

### 3. Public Side
- `/offer/$slug` route — renders campaign cover, dynamic form from `fields_schema`, submit handler
- Server fn `submitOfferEntry` — validation, dedupe by email+campaign, IP rate limit
- Winner announcement section on same page after `ends_at`

### 4. Integration
- Sitemap auto-includes active offers
- Admin sidebar entry "Offers & Giveaways" under Marketing group

## এই টার্নে ডেলিভারেবল
সব ৪টা phase একটানা — migration, admin CRUD + form builder, public form route, AI winner selection server fn।

## কনফার্মেশন
- AI winner selection criteria: শুধু validity/completeness নাকি custom prompt admin দিবে প্রতি campaign-এ?
- File upload field দরকার (যেমন screenshot upload)?
- Email notification winner-দের — এখনই scaffold করব নাকি পরের phase?
