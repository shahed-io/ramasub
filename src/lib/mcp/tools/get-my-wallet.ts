import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_wallet",
  title: "Get my wallet",
  description: "Read the signed-in user's Rama Sub wallet balance and the 10 most recent transactions.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const [{ data: wallet, error: wErr }, { data: txns, error: tErr }] = await Promise.all([
      sb.from("wallets").select("balance,updated_at").eq("user_id", ctx.getUserId()).maybeSingle(),
      sb
        .from("wallet_transactions")
        .select("id,amount,type,reason,balance_after,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (wErr || tErr) {
      return { content: [{ type: "text", text: (wErr ?? tErr)!.message }], isError: true };
    }
    const payload = { balance: wallet?.balance ?? 0, transactions: txns ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
