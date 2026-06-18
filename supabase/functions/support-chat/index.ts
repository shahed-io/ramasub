// AccessNow BD — AI support chat (streaming via Lovable AI Gateway)
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/accessnowbd\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/accessnowbd\.com$/,
  /^https:\/\/(www\.)?accessnowbd\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
];
function corsFor(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
  return {
    "Access-Control-Allow-Origin": allow ? origin : "null",
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as Record<string, string>;
}

const MAX_MESSAGES = 20;
const MAX_CONTENT_LEN = 4000;

const SYSTEM_PROMPT = `তুমি AccessNow BD-এর প্রিমিয়াম সাপোর্ট অ্যাসিস্ট্যান্ট। বাংলায় (প্রয়োজনে English mix) বন্ধুসুলভ, সংক্ষিপ্ত, সঠিক উত্তর দাও।

📦 আমরা যা বিক্রি করি:
- OTT/Streaming: Netflix, Prime Video, Hoichoi, Chorki, Disney+, YouTube Premium, Spotify
- AI Tools: ChatGPT Plus, Claude, Gemini Advanced, Google One AI
- Education: Coursera, Grammarly, Quillbot
- Design/Editing: Canva Pro, CapCut Pro, Adobe Creative Cloud, Freepik
- Productivity: Microsoft 365, Office, Windows License, Zoom Pro
- VPN & Security: NordVPN, ExpressVPN, Surfshark, Proton

⚡ সার্ভিস বৈশিষ্ট্য:
- ১০ মিনিটে ডেলিভারি (পেমেন্ট কনফার্ম হলে)
- ১০০% ভেরিফাইড লাইসেন্স ও ওয়ারেন্টি
- ২৪/৭ লাইভ সাপোর্ট
- WELCOME20 কুপনে প্রথম অর্ডারে ২০% ডিসকাউন্ট

💳 পেমেন্ট: bKash, Nagad, Rocket, Visa, Mastercard
🕒 অফিস টাইম: প্রতিদিন সকাল ১১টা – রাত ১১টা

📞 জরুরি যোগাযোগ:
- WhatsApp: +880 1580-607614
- Email: support@accessnowbd.com

নিয়ম:
- উত্তর সংক্ষিপ্ত রাখো (২–৪ লাইন সাধারণত)
- দাম জানতে চাইলে "সব প্রোডাক্টের আপডেট প্রাইসের জন্য আমাদের /products পেজ দেখুন বা WhatsApp করুন" বলো — নির্দিষ্ট দাম invent করো না
- Order/refund/payment issue হলে WhatsApp-এ যোগাযোগ করতে বলো
- অজানা প্রশ্নে honest থেকো, সরাসরি WhatsApp suggest করো`;

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `messages must be an array of 1..${MAX_MESSAGES} items` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate each message shape and length
    for (const m of messages) {
      if (!m || typeof m !== "object") return new Response(JSON.stringify({ error: "invalid message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const role = (m as any).role;
      const content = (m as any).content;
      if (role !== "user" && role !== "assistant" && role !== "system") {
        return new Response(JSON.stringify({ error: "invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (typeof content !== "string" || content.length === 0 || content.length > MAX_CONTENT_LEN) {
        return new Response(JSON.stringify({ error: `content must be a string of 1..${MAX_CONTENT_LEN} chars` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({ error: "একটু পরে আবার চেষ্টা করুন — অনেক রিকোয়েস্ট আসছে।" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI সার্ভিসে ক্রেডিট শেষ — অ্যাডমিনকে জানান।" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await upstream.text();
      console.error("AI gateway error", upstream.status, t);
      return new Response(
        JSON.stringify({ error: "AI সার্ভিসে সমস্যা।" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
