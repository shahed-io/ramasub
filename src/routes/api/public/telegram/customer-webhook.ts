import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------
// Customer Telegram bot webhook — Rama Sub
//
// Full in-bot shopping: browse → select → checkout → pay → order.
// Also handles account linking (deep-link code / phone contact / OTP).
// ---------------------------------------------------------------

let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _admin;
}

async function loadBot() {
  const { data } = await admin()
    .from("telegram_settings" as any)
    .select("customer_bot_token, customer_bot_enabled, customer_bot_username, customer_webhook_secret")
    .eq("singleton", true)
    .maybeSingle();
  return data as any;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- Telegram API helpers ----------
async function tgCall(token: string, method: string, body: Record<string, unknown>) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await r.json().catch(() => ({}));
  } catch {
    return {};
  }
}

async function reply(token: string, chatId: number, text: string, extra: Record<string, unknown> = {}) {
  await tgCall(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

async function sendPhoto(token: string, chatId: number, photo: string, caption: string, extra: Record<string, unknown> = {}) {
  await tgCall(token, "sendPhoto", {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: "HTML",
    ...extra,
  });
}

async function answerCallback(token: string, callbackId: string, text?: string) {
  await tgCall(token, "answerCallbackQuery", { callback_query_id: callbackId, text: text ?? "" });
}

// ---------- Session state ----------
type Session = {
  chat_id: number;
  user_id: string | null;
  step: string;
  context: Record<string, any>;
};

async function getSession(chatId: number): Promise<Session> {
  const { data } = await admin()
    .from("telegram_bot_sessions" as any)
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (data) return data as any;
  return { chat_id: chatId, user_id: null, step: "idle", context: {} };
}

async function saveSession(s: Session): Promise<void> {
  await admin()
    .from("telegram_bot_sessions" as any)
    .upsert(
      {
        chat_id: s.chat_id,
        user_id: s.user_id,
        step: s.step,
        context: s.context,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "chat_id" },
    );
}

async function resetSession(chatId: number): Promise<void> {
  await admin()
    .from("telegram_bot_sessions" as any)
    .upsert({ chat_id: chatId, step: "idle", context: {}, updated_at: new Date().toISOString() } as any, {
      onConflict: "chat_id",
    });
}

async function findLinkedUser(chatId: number): Promise<{ user_id: string; first_name?: string } | null> {
  const { data } = await admin()
    .from("telegram_customer_links" as any)
    .select("user_id, first_name")
    .eq("chat_id", chatId)
    .maybeSingle();
  return (data as any) ?? null;
}

// ---------- Phone / link helpers (existing) ----------
function normalisePhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "");
  return trimmed.replace(/\D/g, "");
}

async function findUserByPhone(phone: string): Promise<string | null> {
  const variants = new Set<string>();
  const digits = phone.replace(/\D/g, "");
  variants.add(phone);
  variants.add(digits);
  if (!phone.startsWith("+")) variants.add("+" + digits);
  if (digits.startsWith("880")) variants.add("0" + digits.slice(3));
  if (digits.startsWith("0")) variants.add("880" + digits.slice(1));
  for (const v of variants) {
    const { data } = await admin().from("profiles" as any).select("id").eq("phone", v).maybeSingle();
    if (data && (data as any).id) return (data as any).id as string;
  }
  return null;
}

async function linkUser(
  userId: string,
  chatId: number,
  info: { username?: string; firstName?: string; lastName?: string; phone?: string },
) {
  await admin()
    .from("telegram_customer_links" as any)
    .upsert(
      {
        user_id: userId,
        chat_id: chatId,
        telegram_username: info.username ?? null,
        first_name: info.firstName ?? null,
        last_name: info.lastName ?? null,
        phone: info.phone ?? null,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id" },
    );
}

// ---------- Shop rendering ----------
const MAIN_MENU = {
  inline_keyboard: [
    [{ text: "🛍️ Shop", callback_data: "shop" }, { text: "📦 My Orders", callback_data: "orders" }],
    [{ text: "💰 Wallet", callback_data: "wallet" }, { text: "🌐 Website", url: "https://ramasub.com" }],
  ],
};

async function sendMainMenu(token: string, chatId: number, name?: string) {
  const greeting = name ? `👋 <b>Hi ${name}!</b>` : "👋 <b>Welcome to Rama Sub!</b>";
  await reply(
    token,
    chatId,
    `${greeting}\n\nবাংলাদেশের বিশ্বস্ত ডিজিটাল subscription shop। নিচ থেকে option select করুন 👇`,
    { reply_markup: MAIN_MENU },
  );
}

async function sendCategories(token: string, chatId: number) {
  const { data } = await admin()
    .from("products" as any)
    .select("category")
    .eq("is_active", true);
  const cats = Array.from(new Set(((data as any[]) ?? []).map((r) => r.category).filter(Boolean)));
  if (cats.length === 0) {
    await reply(token, chatId, "🙁 এই মুহূর্তে কোনো product নেই।", { reply_markup: MAIN_MENU });
    return;
  }
  const keyboard = cats.map((c) => [{ text: `📂 ${c}`, callback_data: `cat:${c.slice(0, 40)}` }]);
  keyboard.push([{ text: "🏠 Home", callback_data: "home" }]);
  await reply(token, chatId, "🛍️ <b>Categories</b>\n\nকোন category দেখতে চান?", {
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function sendProductsInCategory(token: string, chatId: number, category: string) {
  const { data } = await admin()
    .from("products" as any)
    .select("slug, name, plans")
    .eq("is_active", true)
    .eq("category", category)
    .order("sort_order")
    .limit(20);
  const rows = ((data as any[]) ?? []).map((p) => {
    const plans = Array.isArray(p.plans) ? p.plans : [];
    const minPrice = plans.length ? Math.min(...plans.map((x: any) => Number(x.price) || Infinity)) : null;
    const priceLabel = minPrice && isFinite(minPrice) ? ` — ৳${minPrice}` : "";
    return [{ text: `${p.name.trim()}${priceLabel}`.slice(0, 60), callback_data: `p:${p.slug}` }];
  });
  if (rows.length === 0) {
    await reply(token, chatId, "এই category তে এখন কোনো product নেই।", {
      reply_markup: { inline_keyboard: [[{ text: "◀️ Back", callback_data: "shop" }]] },
    });
    return;
  }
  rows.push([{ text: "◀️ Categories", callback_data: "shop" }]);
  await reply(token, chatId, `📂 <b>${escHtml(category)}</b>\n\nProduct select করুন 👇`, {
    reply_markup: { inline_keyboard: rows },
  });
}

function escHtml(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

async function sendProductDetail(token: string, chatId: number, slug: string) {
  const { data: p } = await admin()
    .from("products" as any)
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!p) {
    await reply(token, chatId, "❌ Product খুঁজে পাওয়া যায়নি।");
    return;
  }
  const prod = p as any;
  const plans = Array.isArray(prod.plans) ? prod.plans : [];
  const priceBlock = plans.length
    ? plans.map((pl: any) => `• <b>${escHtml(pl.label ?? pl.duration ?? "Plan")}</b> — ৳${pl.price}`).join("\n")
    : "Price on request";
  const shortDesc = (prod.short_description || prod.tagline || "").toString().slice(0, 400);
  const caption =
    `${prod.emoji ?? "📦"} <b>${escHtml(prod.name)}</b>\n` +
    (shortDesc ? `\n${escHtml(shortDesc)}\n` : "") +
    `\n<b>Plans:</b>\n${priceBlock}\n` +
    `\n⏱ ${escHtml(prod.delivery_time || "Fast delivery")}\n🛡 ${escHtml(prod.warranty || "Warranty included")}`;

  const buyRows = plans.length
    ? plans.slice(0, 6).map((pl: any, i: number) => [
        { text: `🛒 Buy — ${pl.label ?? pl.duration ?? "Plan"} (৳${pl.price})`.slice(0, 60), callback_data: `buy:${slug}:${i}` },
      ])
    : [[{ text: "🛒 Buy Now", callback_data: `buy:${slug}:0` }]];
  buyRows.push([{ text: "◀️ Back", callback_data: `cat:${(prod.category ?? "").slice(0, 40)}` }, { text: "🏠 Home", callback_data: "home" }]);

  if (prod.image_url) {
    await sendPhoto(token, chatId, prod.image_url, caption, { reply_markup: { inline_keyboard: buyRows } });
  } else {
    await reply(token, chatId, caption, { reply_markup: { inline_keyboard: buyRows } });
  }
}

// ---------- Checkout ----------
async function startCheckout(token: string, chatId: number, slug: string, planIdx: number) {
  const linked = await findLinkedUser(chatId);
  if (!linked) {
    await reply(
      token,
      chatId,
      "🔒 <b>Account link করতে হবে</b>\n\nOrder দেওয়ার আগে RamaSub account connect করা লাগবে (এক মিনিটের কাজ)।\n\n👉 <a href=\"https://ramasub.com/connect-telegram\">এখানে ক্লিক করুন</a> — signup না থাকলে আগে <a href=\"https://ramasub.com/register\">register</a> করুন।\n\nঅথবা phone number share করুন — যদি ওই phone-এ RamaSub account থাকে, আমরা automatic link করে দেব 👇",
      {
        reply_markup: { keyboard: [[{ text: "📱 Share phone number", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
      },
    );
    return;
  }

  const { data: p } = await admin()
    .from("products" as any)
    .select("slug, name, plans")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!p) {
    await reply(token, chatId, "❌ Product আর available নেই।");
    return;
  }
  const prod = p as any;
  const plans = Array.isArray(prod.plans) ? prod.plans : [];
  const plan = plans[planIdx] ?? plans[0] ?? { label: "Default", price: 0 };

  const session: Session = {
    chat_id: chatId,
    user_id: linked.user_id,
    step: "checkout:choose_payment",
    context: {
      slug: prod.slug,
      name: prod.name,
      plan_label: plan.label ?? plan.duration ?? "Plan",
      price: Number(plan.price) || 0,
    },
  };
  await saveSession(session);

  const summary =
    `🧾 <b>Order Summary</b>\n\n` +
    `📦 <b>${escHtml(prod.name)}</b>\n` +
    `⏱ Plan: <b>${escHtml(session.context.plan_label)}</b>\n` +
    `💵 Total: <b>৳${session.context.price}</b>\n\n` +
    `Payment method select করুন 👇`;

  await reply(token, chatId, summary, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "💰 Wallet Balance", callback_data: "pay:wallet" }],
        [{ text: "📱 bKash", callback_data: "pay:bkash" }, { text: "📱 Nagad", callback_data: "pay:nagad" }],
        [{ text: "❌ Cancel", callback_data: "cancel" }],
      ],
    },
  });
}

async function getPaymentMethod(id: "bkash" | "nagad") {
  const { data } = await admin()
    .from("admin_records" as any)
    .select("data")
    .eq("kind", "payment_method")
    .eq("is_active", true);
  const arr = ((data as any[]) ?? []).map((r) => r.data).filter((d) => d?.id === id);
  return arr[0] ?? null;
}

async function handlePayWallet(token: string, chatId: number, session: Session) {
  const uid = session.user_id!;
  const price = Number(session.context.price) || 0;

  const { data: w } = await admin().from("wallets" as any).select("balance").eq("user_id", uid).maybeSingle();
  const balance = Number((w as any)?.balance ?? 0);
  if (balance < price) {
    await reply(
      token,
      chatId,
      `😔 <b>Insufficient wallet balance</b>\n\nCurrent: ৳${balance}\nRequired: ৳${price}\n\nWallet top-up করুন <a href="https://ramasub.com/wallet">এখানে</a>, তারপর আবার order try করুন।`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📱 Pay with bKash instead", callback_data: "pay:bkash" }],
            [{ text: "🏠 Home", callback_data: "home" }],
          ],
        },
      },
    );
    return;
  }
  await reply(
    token,
    chatId,
    `✅ <b>Confirm Order</b>\n\n📦 ${escHtml(session.context.name)}\n⏱ ${escHtml(session.context.plan_label)}\n💵 ৳${price}\n\n💰 Wallet balance: ৳${balance}\nDeduct after: ৳${balance - price}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Confirm & Place Order", callback_data: "confirm:wallet" }],
          [{ text: "❌ Cancel", callback_data: "cancel" }],
        ],
      },
    },
  );
  session.step = "checkout:confirm_wallet";
  await saveSession(session);
}

async function handlePayMFS(token: string, chatId: number, session: Session, id: "bkash" | "nagad") {
  const pm = await getPaymentMethod(id);
  if (!pm) {
    await reply(token, chatId, `❌ ${id} এই মুহূর্তে available নেই।`);
    return;
  }
  session.step = "checkout:awaiting_trxid";
  session.context.payment_method = id;
  session.context.pay_number = pm.number;
  await saveSession(session);

  const emoji = id === "bkash" ? "📱" : "📱";
  const brand = pm.name ?? id;
  await reply(
    token,
    chatId,
    `${emoji} <b>${escHtml(brand)} Payment</b>\n\n` +
      `1️⃣ ${escHtml(brand)} app খুলুন → <b>${escHtml(pm.send_money_label ?? "Send Money")}</b>\n` +
      `2️⃣ নিচের number-এ পাঠান:\n\n` +
      `📞 <code>${escHtml(pm.number)}</code>  <i>(tap to copy)</i>\n` +
      `💵 Amount: <b>৳${session.context.price}</b>\n\n` +
      `3️⃣ পাঠানোর পর <b>TrxID</b> কপি করে এখানে reply করুন (উদাহরণ: <code>9AB12CD34E</code>)।\n\n` +
      `<i>${escHtml(pm.instructions ?? "")}</i>`,
    {
      reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel" }]] },
    },
  );
}

async function createOrder(session: Session, opts: { paymentMethod: string; transactionId: string; status?: string; paymentStatus?: string }) {
  const uid = session.user_id!;
  const { data: profile } = await admin().from("profiles" as any).select("display_name, phone").eq("id", uid).maybeSingle();
  const p = (profile as any) ?? {};

  // Fetch email from auth.users via admin
  const { data: userRow } = await (admin().auth as any).admin.getUserById(uid);
  const email = userRow?.user?.email ?? "no-email@ramasub.com";

  const items = [
    {
      slug: session.context.slug,
      name: session.context.name,
      plan: session.context.plan_label,
      price: session.context.price,
      quantity: 1,
    },
  ];

  const { data: order, error } = await admin()
    .from("orders" as any)
    .insert({
      user_id: uid,
      full_name: p.display_name || "Telegram Customer",
      email,
      phone: p.phone || "N/A",
      payment_method: opts.paymentMethod,
      transaction_id: opts.transactionId,
      items,
      total: session.context.price,
      status: opts.status ?? "pending",
      payment_status: opts.paymentStatus ?? "pending",
    } as any)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (order as any).id as string;
}

async function confirmWalletOrder(token: string, chatId: number, session: Session) {
  const uid = session.user_id!;
  const price = Number(session.context.price) || 0;

  // Re-check balance & deduct atomically-ish via admin update
  const { data: w } = await admin().from("wallets" as any).select("balance").eq("user_id", uid).maybeSingle();
  const balance = Number((w as any)?.balance ?? 0);
  if (balance < price) {
    await reply(token, chatId, "😔 Wallet balance যথেষ্ট নেই এখন। আবার try করুন।");
    await resetSession(chatId);
    return;
  }

  // Create order first (status=processing since paid via wallet)
  let orderId: string;
  try {
    orderId = await createOrder(session, {
      paymentMethod: "wallet",
      transactionId: `WALLET-${Date.now()}`,
      status: "processing",
      paymentStatus: "paid",
    });
  } catch (e) {
    await reply(token, chatId, `❌ Order create করা যায়নি: ${(e as Error).message}`);
    return;
  }

  // Deduct wallet
  const newBalance = balance - price;
  await admin().from("wallets" as any).update({ balance: newBalance, updated_at: new Date().toISOString() } as any).eq("user_id", uid);
  await admin().from("wallet_transactions" as any).insert({
    user_id: uid,
    amount: -price,
    type: "spend",
    reason: `Order payment (Telegram bot): ${session.context.name}`,
    ref_order_id: orderId,
    balance_after: newBalance,
    created_by: uid,
  } as any);

  const shortId = "ORD-" + orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  await reply(
    token,
    chatId,
    `✅ <b>Order placed successfully!</b>\n\n🆔 ${shortId}\n💰 Paid via Wallet: ৳${price}\n📊 New balance: ৳${newBalance}\n\nআপনার order processing শুরু হয়েছে। Delivery হলে এখানেই notification পাবেন।\n\n🔗 <a href="https://ramasub.com/orders/${orderId}">Order details</a>`,
    { reply_markup: MAIN_MENU },
  );
  await resetSession(chatId);
}

async function submitMFSOrder(token: string, chatId: number, session: Session, trxid: string) {
  const clean = trxid.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,20}$/.test(clean)) {
    await reply(token, chatId, "❌ TrxID format ঠিক না। সাধারণত 10 character alphanumeric হয়। আবার পাঠান।");
    return;
  }
  let orderId: string;
  try {
    orderId = await createOrder(session, {
      paymentMethod: session.context.payment_method,
      transactionId: clean,
      status: "pending",
      paymentStatus: "pending",
    });
  } catch (e) {
    await reply(token, chatId, `❌ Order create করা যায়নি: ${(e as Error).message}`);
    return;
  }
  const shortId = "ORD-" + orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  await reply(
    token,
    chatId,
    `✅ <b>Order received!</b>\n\n🆔 ${shortId}\n💵 Amount: ৳${session.context.price}\n🧾 TrxID: <code>${escHtml(clean)}</code>\n\n⏳ আমরা payment verify করছি। ১৫-৩০ মিনিটের মধ্যে delivery পাবেন।\n\n🔗 <a href="https://ramasub.com/orders/${orderId}">Track order</a>`,
    { reply_markup: MAIN_MENU },
  );
  await resetSession(chatId);
}

// ---------- Info commands ----------
async function sendMyOrders(token: string, chatId: number) {
  const linked = await findLinkedUser(chatId);
  if (!linked) {
    await reply(token, chatId, "🔒 Order দেখতে account link করতে হবে। /start দিন।");
    return;
  }
  const { data } = await admin()
    .from("orders" as any)
    .select("id, total, status, created_at, items")
    .eq("user_id", linked.user_id)
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = (data as any[]) ?? [];
  if (rows.length === 0) {
    await reply(token, chatId, "📭 এখনো কোনো order নেই। 🛍️ Shop থেকে কিছু কিনুন!", { reply_markup: MAIN_MENU });
    return;
  }
  const emoji: Record<string, string> = { pending: "⏳", processing: "⚙️", completed: "✅", delivered: "📦", cancelled: "❌", failed: "⚠️" };
  const lines = rows
    .map((r) => {
      const short = "ORD-" + r.id.replace(/-/g, "").slice(0, 8).toUpperCase();
      const first = Array.isArray(r.items) && r.items[0] ? r.items[0].name : "Order";
      const em = emoji[r.status] ?? "🔔";
      return `${em} <b>${short}</b> · ৳${r.total} · <i>${r.status}</i>\n   ${escHtml(String(first).slice(0, 50))}`;
    })
    .join("\n\n");
  await reply(token, chatId, `📦 <b>Your last 10 orders</b>\n\n${lines}\n\n🔗 <a href="https://ramasub.com/orders">All orders</a>`, {
    reply_markup: MAIN_MENU,
  });
}

async function sendWallet(token: string, chatId: number) {
  const linked = await findLinkedUser(chatId);
  if (!linked) {
    await reply(token, chatId, "🔒 Wallet দেখতে account link করতে হবে। /start দিন।");
    return;
  }
  const { data } = await admin().from("wallets" as any).select("balance").eq("user_id", linked.user_id).maybeSingle();
  const bal = Number((data as any)?.balance ?? 0);
  await reply(
    token,
    chatId,
    `💰 <b>Wallet Balance</b>\n\n<b>৳${bal}</b>\n\nTop-up করতে <a href="https://ramasub.com/wallet">এখানে ক্লিক করুন</a>।`,
    { reply_markup: MAIN_MENU },
  );
}

// ---------- Callback query dispatcher ----------
async function handleCallback(token: string, chatId: number, data: string, callbackId: string) {
  await answerCallback(token, callbackId);

  if (data === "home") return sendMainMenu(token, chatId);
  if (data === "shop") return sendCategories(token, chatId);
  if (data === "orders") return sendMyOrders(token, chatId);
  if (data === "wallet") return sendWallet(token, chatId);
  if (data === "cancel") {
    await resetSession(chatId);
    return reply(token, chatId, "❌ Cancelled.", { reply_markup: MAIN_MENU });
  }

  if (data.startsWith("cat:")) return sendProductsInCategory(token, chatId, data.slice(4));
  if (data.startsWith("p:")) return sendProductDetail(token, chatId, data.slice(2));

  if (data.startsWith("buy:")) {
    const [, slug, idx] = data.split(":");
    return startCheckout(token, chatId, slug, Number(idx) || 0);
  }

  if (data.startsWith("pay:")) {
    const method = data.slice(4);
    const session = await getSession(chatId);
    if (!session.user_id) return reply(token, chatId, "Session expired. /shop থেকে আবার শুরু করুন।");
    if (method === "wallet") return handlePayWallet(token, chatId, session);
    if (method === "bkash" || method === "nagad") return handlePayMFS(token, chatId, session, method);
  }

  if (data === "confirm:wallet") {
    const session = await getSession(chatId);
    if (session.step !== "checkout:confirm_wallet") {
      return reply(token, chatId, "Session expired.", { reply_markup: MAIN_MENU });
    }
    return confirmWalletOrder(token, chatId, session);
  }
}

// ---------------------------------------------------------------
export const Route = createFileRoute("/api/public/telegram/customer-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let update: any = {};
        try {
          update = await request.json();
        } catch {
          return Response.json({ ok: true });
        }

        const bot = await loadBot();
        if (!bot?.customer_bot_token || !bot?.customer_bot_enabled) {
          return Response.json({ ok: true, ignored: "bot_disabled" });
        }

        const expectedSecret = (bot.customer_webhook_secret as string | null) ?? "";
        const providedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!expectedSecret || !safeEqual(providedSecret, expectedSecret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const token = bot.customer_bot_token as string;

        // Callback query (inline button tap)
        if (update.callback_query) {
          const cb = update.callback_query;
          const chatId = cb.message?.chat?.id;
          if (chatId) {
            try { await handleCallback(token, chatId, cb.data ?? "", cb.id); } catch (e) {
              await reply(token, chatId, `⚠️ ${(e as Error).message}`);
            }
          }
          return Response.json({ ok: true });
        }

        const msg = update.message;
        if (!msg?.chat?.id) return Response.json({ ok: true });
        const chatId: number = msg.chat.id;
        const from = msg.from ?? {};
        const info = {
          username: from.username as string | undefined,
          firstName: from.first_name as string | undefined,
          lastName: from.last_name as string | undefined,
        };

        // Contact share → phone auto-link
        if (msg.contact?.phone_number) {
          const phone = normalisePhone(msg.contact.phone_number);
          const userId = await findUserByPhone(phone);
          if (!userId) {
            await reply(
              token,
              chatId,
              "❌ এই phone number দিয়ে RamaSub-এ কোনো account নেই।\n\nআগে <a href=\"https://ramasub.com/register\">signup</a> করুন।",
              { reply_markup: { remove_keyboard: true } },
            );
            return Response.json({ ok: true });
          }
          if (msg.contact.user_id && Number(msg.contact.user_id) === Number(from.id)) {
            await linkUser(userId, chatId, { ...info, phone });
            await reply(token, chatId, `✅ <b>Connected!</b> এখন আপনি bot থেকে সরাসরি কিনতে পারবেন।`, {
              reply_markup: { remove_keyboard: true },
            });
            await sendMainMenu(token, chatId, info.firstName);
            return Response.json({ ok: true });
          }
          const code = String(Math.floor(100000 + Math.random() * 900000));
          await admin().from("telegram_phone_otps" as any).insert({ chat_id: chatId, phone, code } as any);
          await reply(token, chatId, `🔐 SMS-এ পাঠানো 6-digit code এখানে reply করুন।`);
          return Response.json({ ok: true });
        }

        const text: string = (msg.text ?? "").trim();

        // /start [code]
        if (text.startsWith("/start")) {
          await resetSession(chatId);
          const parts = text.split(/\s+/);
          const code = parts[1];
          if (code) {
            const { data: linkCode } = await admin()
              .from("telegram_link_codes" as any)
              .select("user_id, expires_at, consumed_at")
              .eq("code", code)
              .maybeSingle();
            const lc = linkCode as any;
            if (!lc) await reply(token, chatId, "❌ Link code invalid অথবা expired।");
            else if (lc.consumed_at) await reply(token, chatId, "❌ এই code ইতিমধ্যে ব্যবহৃত।");
            else if (new Date(lc.expires_at) < new Date()) await reply(token, chatId, "❌ Link code-এর সময় শেষ।");
            else {
              await linkUser(lc.user_id, chatId, info);
              await (admin().from("telegram_link_codes" as any) as any)
                .update({ consumed_at: new Date().toISOString() }).eq("code", code);
              await reply(token, chatId, `✅ <b>Connected!</b> এখন থেকে সব order update পাবেন।`);
              await sendMainMenu(token, chatId, info.firstName);
            }
            return Response.json({ ok: true });
          }
          await sendMainMenu(token, chatId, info.firstName);
          return Response.json({ ok: true });
        }

        if (text === "/shop") { await sendCategories(token, chatId); return Response.json({ ok: true }); }
        if (text === "/orders") { await sendMyOrders(token, chatId); return Response.json({ ok: true }); }
        if (text === "/wallet") { await sendWallet(token, chatId); return Response.json({ ok: true }); }
        if (text === "/cancel") { await resetSession(chatId); await reply(token, chatId, "❌ Cancelled.", { reply_markup: MAIN_MENU }); return Response.json({ ok: true }); }
        if (text === "/unlink") {
          await admin().from("telegram_customer_links" as any).delete().eq("chat_id", chatId);
          await reply(token, chatId, "🔌 Disconnected. আবার connect করতে /start দিন।");
          return Response.json({ ok: true });
        }
        if (text === "/help") {
          await reply(
            token,
            chatId,
            `<b>Commands</b>\n\n/start — main menu\n/shop — browse products\n/orders — your orders\n/wallet — wallet balance\n/cancel — cancel current step\n/unlink — disconnect account\n\n🌐 https://ramasub.com`,
            { reply_markup: MAIN_MENU },
          );
          return Response.json({ ok: true });
        }

        // Text handling by current session step
        const session = await getSession(chatId);

        if (session.step === "checkout:awaiting_trxid") {
          await submitMFSOrder(token, chatId, session, text);
          return Response.json({ ok: true });
        }

        // 6-digit OTP fallback
        if (/^\d{6}$/.test(text)) {
          const { data: pending } = await admin()
            .from("telegram_phone_otps" as any)
            .select("*")
            .eq("chat_id", chatId)
            .is("verified_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const p = pending as any;
          if (!p) { await reply(token, chatId, "কোনো pending verification নেই। /start দিন।"); return Response.json({ ok: true }); }
          if (new Date(p.expires_at) < new Date()) { await reply(token, chatId, "❌ OTP expired."); return Response.json({ ok: true }); }
          if (p.attempts >= 5) { await reply(token, chatId, "❌ অনেকবার ভুল try।"); return Response.json({ ok: true }); }
          if (p.code !== text) {
            await (admin().from("telegram_phone_otps" as any) as any).update({ attempts: (p.attempts ?? 0) + 1 }).eq("id", p.id);
            await reply(token, chatId, "❌ ভুল code।"); return Response.json({ ok: true });
          }
          const uid = await findUserByPhone(p.phone);
          if (!uid) { await reply(token, chatId, "❌ Account পাওয়া যায়নি।"); return Response.json({ ok: true }); }
          await linkUser(uid, chatId, { ...info, phone: p.phone });
          await (admin().from("telegram_phone_otps" as any) as any).update({ verified_at: new Date().toISOString() }).eq("id", p.id);
          await reply(token, chatId, "✅ <b>Connected!</b>");
          await sendMainMenu(token, chatId, info.firstName);
          return Response.json({ ok: true });
        }

        // Default fallback
        await sendMainMenu(token, chatId, info.firstName);
        return Response.json({ ok: true });
      },
    },
  },
});
