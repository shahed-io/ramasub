import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PageStatus = "published" | "draft" | "hidden";
export type PageType = "content" | "structured" | "home_section";

export type PageBlock =
  | { id: string; type: "heading"; level: 1 | 2 | 3; text: string; align?: "left" | "center" | "right" }
  | { id: string; type: "paragraph"; html: string }
  | { id: string; type: "image"; url: string; alt?: string; caption?: string; width?: number }
  | { id: string; type: "button"; label: string; href: string; variant?: "primary" | "secondary" | "ghost" }
  | { id: string; type: "divider" }
  | { id: string; type: "html"; code: string }
  | { id: string; type: "faq"; items: { q: string; a: string }[] };

export type PageSeo = {
  title?: string;
  description?: string;
  og_image?: string;
  canonical?: string;
  noindex?: boolean;
};

export type PageContent = {
  blocks: PageBlock[];
  text_zones?: Record<string, string>;
  section_toggles?: Record<string, boolean>;
};

export type SitePage = {
  id: string;
  key: string;
  title: string;
  path: string;
  page_type: PageType;
  status: PageStatus;
  seo: PageSeo;
  content: PageContent;
  show_in_menu: boolean;
  sort_order: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export const BLOCK_TYPES: { type: PageBlock["type"]; label: string; icon: string }[] = [
  { type: "heading", label: "Heading", icon: "H" },
  { type: "paragraph", label: "Paragraph", icon: "¶" },
  { type: "image", label: "Image", icon: "🖼" },
  { type: "button", label: "Button", icon: "▶" },
  { type: "faq", label: "FAQ", icon: "?" },
  { type: "divider", label: "Divider", icon: "—" },
  { type: "html", label: "HTML embed", icon: "</>" },
];

export function newBlock(type: PageBlock["type"]): PageBlock {
  const id = `b_${Math.random().toString(36).slice(2, 9)}`;
  switch (type) {
    case "heading": return { id, type, level: 2, text: "New heading", align: "left" };
    case "paragraph": return { id, type, html: "Write your content here…" };
    case "image": return { id, type, url: "", alt: "" };
    case "button": return { id, type, label: "Learn more", href: "/", variant: "primary" };
    case "divider": return { id, type };
    case "html": return { id, type, code: "" };
    case "faq": return { id, type, items: [{ q: "Question?", a: "Answer." }] };
  }
}

export async function fetchPageByKey(key: string): Promise<SitePage | null> {
  const { data, error } = await supabase
    .from("site_pages")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data as SitePage | null;
}

export async function fetchAllPages(): Promise<SitePage[]> {
  const { data, error } = await supabase
    .from("site_pages")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as SitePage[]) ?? [];
}

export function usePage(key: string) {
  return useQuery({
    queryKey: ["site_page", key],
    queryFn: () => fetchPageByKey(key),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAllPages() {
  return useQuery({
    queryKey: ["site_pages"],
    queryFn: fetchAllPages,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/** Read a text zone with a static fallback so routes stay safe if DB is empty. */
export function pageText(page: SitePage | null | undefined, key: string, fallback: string): string {
  const v = page?.content?.text_zones?.[key];
  return typeof v === "string" && v.trim() ? v : fallback;
}

/** Read a section toggle (default = true when unset). */
export function pageSection(page: SitePage | null | undefined, key: string, defaultOn = true): boolean {
  const v = page?.content?.section_toggles?.[key];
  return typeof v === "boolean" ? v : defaultOn;
}
