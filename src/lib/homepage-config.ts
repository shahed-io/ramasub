import { supabase } from "@/integrations/supabase/client";

export type SectionId =
  | "banner"
  | "pills"
  | "featured"
  | "rails"
  | "recentlyViewed"
  | "reviews";

export type HomepageSection = {
  id: SectionId;
  label: string;
  visible: boolean;
  order: number;
};

export type HomepageSeo = {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
};

export type HomepageConfig = {
  sections: HomepageSection[];
  featuredProductSlugs: string[]; // empty = auto pick
  seo: HomepageSeo;
};

export const HOMEPAGE_CONFIG_KIND = "homepage_config";

export const DEFAULT_SECTIONS: HomepageSection[] = [
  { id: "banner", label: "Banner Slider", visible: true, order: 0 },
  { id: "pills", label: "Category Pills", visible: true, order: 1 },
  { id: "featured", label: "Featured Products", visible: true, order: 2 },
  { id: "rails", label: "Category Rails", visible: true, order: 3 },
  { id: "recentlyViewed", label: "Recently Viewed", visible: true, order: 4 },
  { id: "reviews", label: "Customer Reviews", visible: true, order: 5 },
];

export const DEFAULT_CONFIG: HomepageConfig = {
  sections: DEFAULT_SECTIONS,
  featuredProductSlugs: [],
  seo: {},
};

/** Merge DB config with defaults so newly added sections show up automatically. */
export function normalizeConfig(data: unknown): HomepageConfig {
  const d = (data ?? {}) as Partial<HomepageConfig>;
  const bySavedId = new Map<SectionId, HomepageSection>();
  for (const s of d.sections ?? []) {
    if (!s || !s.id) continue;
    bySavedId.set(s.id as SectionId, {
      id: s.id as SectionId,
      label: DEFAULT_SECTIONS.find((x) => x.id === s.id)?.label ?? String(s.id),
      visible: s.visible !== false,
      order: typeof s.order === "number" ? s.order : 999,
    });
  }
  const merged: HomepageSection[] = DEFAULT_SECTIONS.map((def, idx) => {
    const saved = bySavedId.get(def.id);
    return saved
      ? { ...def, visible: saved.visible, order: saved.order }
      : { ...def, order: def.order + idx * 0 };
  }).sort((a, b) => a.order - b.order);

  return {
    sections: merged,
    featuredProductSlugs: Array.isArray(d.featuredProductSlugs)
      ? d.featuredProductSlugs.filter((x): x is string => typeof x === "string")
      : [],
    seo: (d.seo && typeof d.seo === "object" ? d.seo : {}) as HomepageSeo,
  };
}

export async function fetchHomepageConfig(): Promise<HomepageConfig> {
  const { data, error } = await supabase
    .from("admin_records")
    .select("id, data")
    .eq("kind", HOMEPAGE_CONFIG_KIND)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return DEFAULT_CONFIG;
  return normalizeConfig(data?.data);
}

export async function saveHomepageConfig(cfg: HomepageConfig): Promise<void> {
  const { data: existing } = await supabase
    .from("admin_records")
    .select("id")
    .eq("kind", HOMEPAGE_CONFIG_KIND)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("admin_records")
      .update({ data: cfg as unknown as Record<string, unknown>, is_active: true })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("admin_records").insert({
      kind: HOMEPAGE_CONFIG_KIND,
      data: cfg as unknown as Record<string, unknown>,
      is_active: true,
      sort_order: 0,
    });
    if (error) throw error;
  }
}
