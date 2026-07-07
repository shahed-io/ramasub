import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type SiteCategory = {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  icon?: string;
  description?: string;
  sort_order: number;
};

function createPublicClient() {
  const env = typeof process !== "undefined" ? process.env : undefined;
  const url = env?.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key =
    env?.SUPABASE_PUBLISHABLE_KEY ||
    env?.SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Category data connection is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function slugify(input: string) {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const listCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteCategory[]> => {
    const { data, error } = await createPublicClient()
      .from("admin_records")
      .select("id,data,sort_order,is_active")
      .eq("kind", "category")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error("Categories could not be loaded");
    const rows = (data ?? []) as Array<{ id: string; data: Record<string, unknown>; sort_order: number | null }>;
    return rows
      .map((r) => {
        const d = r.data ?? {};
        const name = String((d as { name?: string }).name ?? "").trim();
        if (!name) return null;
        const slug = String((d as { slug?: string }).slug ?? "").trim() || slugify(name);
        return {
          id: r.id,
          name,
          slug,
          image_url: (d as { image_url?: string }).image_url || undefined,
          icon: (d as { icon?: string }).icon || undefined,
          description: (d as { description?: string }).description || undefined,
          sort_order: r.sort_order ?? 0,
        } satisfies SiteCategory;
      })
      .filter((x): x is SiteCategory => x !== null);
  },
);
