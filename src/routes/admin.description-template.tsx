import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductMarkdown } from "@/components/ProductMarkdown";
import { toast } from "sonner";

const FALLBACK = `## {Product Name} – {one-line value proposition}\n\n{Intro paragraph}\n\n## Choose Your Plan\n\n### 🟪 Basic – 1 month\n- benefit\n\n## Powerful Features\n- feature\n\n## Why Buy From AccessNow BD\n- Trusted provider\n\n## Delivery Information\n- Within 1–2 hours`;

const SECTION_SNIPPETS: { label: string; body: string }[] = [
  { label: "Intro", body: "## {Product Name} – {one-line value proposition}\n\n{2-4 sentence intro paragraph.}\n" },
  { label: "Plans", body: "## Choose Your {Brand} Plan\n\n### 🟪 {Plan 1} – {duration}\n- benefit\n- benefit\n\n### 🟦 {Plan 2} – {duration}\n- benefit\n\n### 🟩 {Plan 3} – {duration}\n- benefit\n" },
  { label: "Features", body: "## Powerful {Brand} Features\n- feature\n- feature\n- feature\n" },
  { label: "Perfect For", body: "## Perfect For\n- **Content Creators** – reason\n- **Marketers** – reason\n- **Students** – reason\n" },
  { label: "Why Buy", body: "## Why Buy From AccessNow BD\n- Trusted provider in Bangladesh\n- Secure delivery\n- Fast support\n" },
  { label: "Delivery", body: "## Delivery Information\n- Delivery within 1–2 hours\n- Secure activation\n" },
  { label: "Note", body: "\n**Note:** {Region-specific availability note}\n" },
];

export const Route = createFileRoute("/admin/description-template")({
  head: () => ({
    meta: [
      { title: "Description Template — Admin" },
      { name: "description", content: "Edit the product description template used by AI generation." },
    ],
  }),
  component: DescriptionTemplatePage,
});

function DescriptionTemplatePage() {
  const [recordId, setRecordId] = useState<string | null>(null);
  const [template, setTemplate] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("admin_records")
        .select("id, data")
        .eq("kind", "description_template")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) toast.error("Failed to load template");
      const tpl = (data?.data as { template?: string } | null)?.template || FALLBACK;
      setRecordId(data?.id ?? null);
      setTemplate(tpl);
      setOriginal(tpl);
      setLoading(false);
    })();
  }, []);

  const dirty = template !== original;

  async function save() {
    setSaving(true);
    try {
      if (recordId) {
        const { error } = await supabase
          .from("admin_records")
          .update({ data: { template }, updated_at: new Date().toISOString() })
          .eq("id", recordId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("admin_records")
          .insert({ kind: "description_template", data: { template }, is_active: true })
          .select("id")
          .single();
        if (error) throw error;
        setRecordId(data.id);
      }
      setOriginal(template);
      toast.success("Template saved — future AI descriptions will use it");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function insertSnippet(body: string) {
    setTemplate((t) => (t.endsWith("\n") ? t + "\n" + body : t + "\n\n" + body));
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            <Link to="/admin" className="hover:underline">Admin</Link> / Description Template
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
            Product Description Template
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            This template is sent to the AI for every generated description. Edit the section order, headings, or wording — no redeploy needed.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTemplate(original)}
            disabled={!dirty || saving}
            className="text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving || loading}
            className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Insert section:</span>
        {SECTION_SNIPPETS.map((s) => (
          <button
            key={s.label}
            onClick={() => insertSnippet(s.body)}
            className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-muted"
          >
            + {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-2">Template markdown</label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            spellCheck={false}
            disabled={loading}
            className="w-full min-h-[70vh] font-mono text-sm p-4 rounded-lg border border-border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Use placeholders like <code>{"{Product Name}"}</code>, <code>{"{Brand}"}</code>, <code>{"{Plan 1}"}</code>. The AI replaces them per product.
          </p>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-2">Live preview</label>
          <div className="min-h-[70vh] p-5 rounded-lg border border-border bg-card overflow-auto">
            <ProductMarkdown source={template} />
          </div>
        </div>
      </div>
    </div>
  );
}
