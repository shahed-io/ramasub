# Full In-Bot Telegram Checkout

Customer একটাও কোথাও ক্লিক না করে সম্পূর্ণ order Telegram bot এর ভিতরেই complete করতে পারবে — product browse → select → address → payment → confirm। ওয়েবসাইট Open করা লাগবে না।

## Admin Setup (আপনার কাজ)

Admin panel → **Telegram** page-এ ইতিমধ্যেই সব field আছে:
1. BotFather-এ নতুন bot বানান (উদাহরণ: `RamaSubShopBot`) → Token কপি
2. `/Mahbub214/telegram` → "Customer Bot" section-এ Token + Username paste
3. Enable → Save → **Register Webhook** চাপুন
4. ব্যাস — bot লাইভ। Customer রা `@RamaSubShopBot` এ `/start` দিলেই shop চালু।

## Customer Flow (Bot এর ভিতরে)

```text
/start
  → 👋 Welcome + [🛍️ Shop] [📦 My Orders] [👤 Account] [💰 Wallet]

🛍️ Shop
  → Categories inline buttons (Netflix, ChatGPT, ...)
  → Category tap → product list (name + price + 🖼️)
  → Product tap → details + [Buy Now] [← Back]

Buy Now
  → Duration/variant pick (1M/3M/6M/12M) if applicable
  → Ask: Full Name?  → text reply
  → Ask: Phone?       → text reply / contact share button
  → Ask: Email?       → text reply
  → Payment method: [💰 Wallet] [📱 bKash] [💳 Card]
       • Wallet → balance check → confirm → order created & paid
       • bKash  → show number + amount → "Send TrxID" text step → screenshot upload → order created (pending)
       • Card   → generate SSLCommerz payment link → send to chat
  → ✅ Order placed! #ORD-12345 → link to /orders/:id + status updates auto-post

📦 My Orders
  → last 10 orders with status pills, tap for details + delivered credentials

💰 Wallet
  → balance + [Top-up] (bKash flow same as above)
```

State machine per chat_id stored in DB (`telegram_bot_sessions`) — step, cart, form data, expiry।

## Technical Plan

### 1. New DB table

```sql
create table public.telegram_bot_sessions (
  chat_id bigint primary key,
  user_id uuid references auth.users(id) on delete cascade,
  step text not null default 'idle',
  context jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
-- No public grants; only service_role (webhook uses admin client). RLS enabled, no policies.
```

### 2. Webhook expansion — `src/routes/api/public/telegram/customer-webhook.ts`

Existing file handles `/start`, link codes, phone OTP। এতে add করব:
- **Callback query handler** (`update.callback_query`) — inline button taps
- **Message router** by session step (`awaiting_name`, `awaiting_phone`, `awaiting_trxid`, `awaiting_screenshot` ...)
- Commands: `/shop`, `/orders`, `/wallet`, `/cancel`
- Photo upload → download via `getFile` → upload to `payment-screenshots` bucket

### 3. Bot helper module — `src/lib/telegram-bot-flow.server.ts`

Pure functions:
- `renderCategories()`, `renderProducts(catId, page)`, `renderProduct(slug)` → returns `{ text, reply_markup }`
- `startCheckout(chatId, productId, variant)`, `handleCheckoutStep(chatId, msg)` → state machine
- `createOrderFromSession(session)` → uses `supabaseAdmin` to insert into `orders`, calls existing wallet/bKash logic
- `sendMessage`, `sendPhoto`, `editMessage`, `answerCallbackQuery` helpers

### 4. Auto-linking

Order create হলে `telegram_customer_links.user_id` set করে — subsequent `/orders` command RLS-safe query দিয়ে data দেখাবে। Guest checkout (no site account) হলে shadow-profile তৈরি হবে phone দিয়ে।

### 5. Order status → auto Telegram push

Existing `notifyTelegram` system এ customer bot push যোগ করব — order status change হলে linked customer এর chat_id-তে message যাবে।

### 6. Admin panel update — `/Mahbub214/telegram`

- "Full In-Bot Shopping" section যুক্ত করব: enable toggle, welcome message customize, category filter (কোন category bot এ দেখাবে)
- Live stats: active sessions, orders via bot (today/week/month)
- Bot preview button

## Files Changed

- `supabase/migrations/*_telegram_bot_sessions.sql` (new table)
- `src/routes/api/public/telegram/customer-webhook.ts` (extend router)
- `src/lib/telegram-bot-flow.server.ts` (new — shop/checkout logic)
- `src/lib/telegram-customer.functions.ts` (add push helpers)
- `src/routes/Mahbub214.telegram.tsx` (new "In-Bot Shopping" panel + stats)
- `src/lib/orders.functions.ts` (small hook to notify telegram on status change if not already)

## Out of Scope (for this pass)

- Native Telegram Payments API (Stripe/BotFather payment provider) — using existing bKash/SSL/wallet instead, যেহেতু বাংলাদেশে ওইটাই ব্যবহৃত
- Group buying / multi-item cart in one order — একবারে একটা product order (v1)। পরে extend করা যাবে

Approve করলে সব একসাথে build করে দেব।
