import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_products",
  title: "List products",
  description: "List active products in the Rama Sub catalog (public data). Supports optional category filter and search by name.",
  inputSchema: {
    category: z.string().optional().describe("Filter by category slug (e.g. 'streaming')."),
    search: z.string().optional().describe("Case-insensitive substring match on product name."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, search, limit }) => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase
      .from("products")
      .select("slug,name,category,tagline,short_description,stock_status,image_url,plans,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(limit ?? 25);
    if (category) q = q.eq("category", category);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
