import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin role required");
}

/**
 * AI-powered winner selection.
 * Sends sanitized submissions to Lovable AI Gateway and asks it to pick top N
 * based on optional admin criteria + completeness/validity heuristics.
 */
export const aiPickWinners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      campaignId: z.string().uuid(),
      method: z.enum(["ai", "random"]).default("ai"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server"); const supabaseAdmin = sa as any;

    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("offer_campaigns" as never)
      .select("*")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (cErr || !campaign) throw new Error(cErr?.message || "Campaign not found");
    const c = campaign as any;

    const { data: subs, error: sErr } = await supabaseAdmin
      .from("offer_submissions" as never)
      .select("id,name,email,phone,answers,created_at")
      .eq("campaign_id", data.campaignId);
    if (sErr) throw new Error(sErr.message);
    const submissions = (subs ?? []) as Array<{
      id: string; name: string; email: string; phone: string | null;
      answers: Record<string, unknown>; created_at: string;
    }>;

    if (submissions.length === 0) throw new Error("No submissions to pick from");

    const winnerCount = Math.max(1, Math.min(c.winner_count || 1, submissions.length));
    let selected: Array<{ id: string; rank: number; score: number; reason: string }> = [];

    if (data.method === "random") {
      const shuffled = [...submissions].sort(() => Math.random() - 0.5);
      selected = shuffled.slice(0, winnerCount).map((s, i) => ({
        id: s.id, rank: i + 1, score: 0,
        reason: "Randomly selected",
      }));
    } else {
      // AI pick via Lovable AI Gateway
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

      const lightweight = submissions.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email.replace(/(.{2}).+(@.+)/, "$1***$2"),
        answers: s.answers,
      }));

      const sysPrompt = `You are a fair giveaway judge. Pick exactly ${winnerCount} winner(s) from the list of submissions. Score each picked winner 0-100 on quality, validity, and engagement. Default criteria: complete answers, genuine engagement, no spam/duplicates/profanity. Custom criteria from organizer: ${c.ai_selection_prompt || "(none — use defaults)"}.`;

      const userPrompt = `Campaign: "${c.title}"\nPrizes: ${JSON.stringify(c.prizes)}\nTotal submissions: ${submissions.length}\n\nSubmissions:\n${JSON.stringify(lightweight, null, 2)}\n\nReturn ONLY valid JSON in this exact shape:\n{"winners":[{"id":"<submission-id>","rank":1,"score":92,"reason":"..."}]}`;

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 429) throw new Error("AI rate limit hit, try again shortly");
        if (res.status === 402) throw new Error("Lovable AI credits exhausted");
        throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? "{}";
      let parsed: { winners?: Array<{ id: string; rank: number; score: number; reason: string }> };
      try { parsed = JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }
      const validIds = new Set(submissions.map((s) => s.id));
      selected = (parsed.winners ?? [])
        .filter((w) => validIds.has(w.id))
        .slice(0, winnerCount)
        .map((w, i) => ({
          id: w.id,
          rank: w.rank || i + 1,
          score: typeof w.score === "number" ? w.score : 0,
          reason: w.reason || "AI selected",
        }));
      if (selected.length === 0) throw new Error("AI did not return valid winners; try random pick");
    }

    // Reset previous winners then mark new ones
    await supabaseAdmin
      .from("offer_submissions" as never)
      .update({ is_winner: false, winner_rank: null, ai_score: null, ai_reason: null })
      .eq("campaign_id", data.campaignId);

    for (const w of selected) {
      await supabaseAdmin
        .from("offer_submissions" as never)
        .update({
          is_winner: true,
          winner_rank: w.rank,
          ai_score: w.score,
          ai_reason: w.reason,
        })
        .eq("id", w.id);
    }

    return { ok: true, count: selected.length, method: data.method };
  });

/** Manually mark/unmark a single submission as a winner. */
export const setWinnerManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      submissionId: z.string().uuid(),
      isWinner: z.boolean(),
      rank: z.number().int().min(1).max(100).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server"); const supabaseAdmin = sa as any;
    const { error } = await supabaseAdmin
      .from("offer_submissions" as never)
      .update({
        is_winner: data.isWinner,
        winner_rank: data.isWinner ? (data.rank ?? 1) : null,
        ai_reason: data.isWinner ? "Manually selected by admin" : null,
      })
      .eq("id", data.submissionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
