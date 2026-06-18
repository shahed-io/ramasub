import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SearchBar } from "@/components/SearchBar";

type Plan = { period: string; price: string; original?: string; popular?: boolean };
type Product = {
  slug: string;
  name: string;
  description: string;
  plans: Plan[];
  delivery_time?: string;
  warranty?: string;
};

export const Route = createFileRoute("/admin/bulk-update")({
  head: () => ({
    meta: [
      { title: "Bulk Update — Admin" },
      { name: "description", content: "Bulk update product descriptions and plan pricing." },
    ],
  }),
  component: BulkUpdatePage,
});

function parsePrice(s: string): number {
  const n = parseFloat(String(s || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function formatBdt(n: number) {
  return `৳${Math.round(n).toLocaleString()}`;
}
function applyTemplate(tpl: string, p: Product) {
  return tpl
    .replaceAll("{Product Name}", p.name)
    .replaceAll("{product_name}", p.name)
    .replaceAll("{Brand}", p.name.split(" ")[0] || p.name);
}

function BulkUpdatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  // Description template controls
  const [tpl, setTpl] = useState("");
  const [tplLoaded, setTplLoaded] = useState(false);
  const [applyDescription, setApplyDescription] = useState(true);
  const [onlyEmptyDesc, setOnlyEmptyDesc] = useState(false);

  // Pricing controls
  const [pricingMode, setPricingMode] = useState<"none" | "percent" | "markup" | "json">("none");
  const [percentOff, setPercentOff] = useState(35);
  const [markupPct, setMarkupPct] = useState(50);
  const [bulkPlansJson, setBulkPlansJson] = useState("");

  // Delivery / warranty
  const [setDelivery, setSetDelivery] = useState(false);
  const [deliveryText, setDeliveryText] = useState("Within 1–30 mins");
  const [setWarranty, setSetWarranty] = useState(false);
  const [warrantyText, setWarrantyText] = useState("Full warranty");

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: prods, error: e1 }, { data: tplRow }] = await Promise.all([
        supabase.from("products").select("slug,name,description,plans,delivery_time,warranty").order("name"),
        supabase
          .from("admin_records")
          .select("data")
          .eq("kind", "description_template")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (e1) toast.error("Failed to load products");
      const safe = (prods || []).map((p: any) => ({
        slug: p.slug,
        name: p.name,
        description: p.description || "",
        plans: Array.isArray(p.plans) ? p.plans : [],
        delivery_time: p.delivery_time || "",
        warranty: p.warranty || "",
      })) as Product[];
      setProducts(safe);
      const t = (tplRow?.data as { template?: string } | null)?.template || "";
      setTpl(t);
      setTplLoaded(true);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [products, filter]);

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.slug)));
  }
  function toggleOne(slug: string) {
    const next = new Set(selected);
    next.has(slug) ? next.delete(slug) : next.add(slug);
    setSelected(next);
  }

  function transformPlans(plans: Plan[]): Plan[] {
    if (pricingMode === "none") return plans;
    if (pricingMode === "json") {
      try {
        const parsed = JSON.parse(bulkPlansJson);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return plans;
    }
    return plans.map((pl) => {
      const price = parsePrice(pl.price);
      if (price <= 0) return pl;
      if (pricingMode === "percent") {
        // Treat current price as discounted; set original so that price = original * (1 - off%)
        const off = Math.max(1, Math.min(90, percentOff)) / 100;
        const original = price / (1 - off);
        return { ...pl, original: formatBdt(original) };
      }
      if (pricingMode === "markup") {
        // original = price * (1 + markup%)
        const m = Math.max(1, markupPct) / 100;
        return { ...pl, original: formatBdt(price * (1 + m)) };
      }
      return pl;
    });
  }

  async function runBulk() {
    const targets = products.filter((p) => selected.has(p.slug));
    if (targets.length === 0) return toast.error("Select at least one product");
    if (applyDescription && !tpl.trim()) return toast.error("No active description template found");
    if (pricingMode === "json") {
      try {
        const parsed = JSON.parse(bulkPlansJson);
        if (!Array.isArray(parsed)) throw new Error();
      } catch {
        return toast.error("Plans JSON must be a valid array");
      }
    }

    setSaving(true);
    setProgress({ done: 0, total: targets.length });
    let ok = 0;
    let fail = 0;

    for (const p of targets) {
      const patch: {
        description?: string;
        plans?: Plan[];
        delivery_time?: string;
        warranty?: string;
      } = {};
      if (applyDescription) {
        if (!onlyEmptyDesc || !p.description.trim()) {
          patch.description = applyTemplate(tpl, p);
        }
      }
      if (pricingMode !== "none") {
        patch.plans = transformPlans(p.plans);
      }
      if (setDelivery) patch.delivery_time = deliveryText;
      if (setWarranty) patch.warranty = warrantyText;

      if (Object.keys(patch).length === 0) {
        ok++;
        setProgress({ done: ok + fail, total: targets.length });
        continue;
      }

      const { error } = await supabase.from("products").update(patch).eq("slug", p.slug);
      if (error) fail++;
      else ok++;
      setProgress({ done: ok + fail, total: targets.length });
    }

    setSaving(false);
    if (fail === 0) toast.success(`Updated ${ok} product${ok === 1 ? "" : "s"}`);
    else toast.error(`Updated ${ok}, failed ${fail}`);

    // Reload list
    const { data: prods } = await supabase
      .from("products")
      .select("slug,name,description,plans,delivery_time,warranty")
      .order("name");
    if (prods)
      setProducts(
        prods.map((p: any) => ({
          slug: p.slug,
          name: p.name,
          description: p.description || "",
          plans: Array.isArray(p.plans) ? p.plans : [],
          delivery_time: p.delivery_time || "",
          warranty: p.warranty || "",
        })),
      );
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1200px] mx-auto">
      <header>
        <h1 className="text-2xl font-bold">Bulk Product Update</h1>
        <p className="text-sm text-muted-foreground">
          Apply the active description template, adjust pricing/plans, or update delivery & warranty across many products at once.
        </p>
      </header>

      {/* Controls */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Description Template</h2>
          {!tplLoaded ? null : tpl ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={applyDescription} onChange={(e) => setApplyDescription(e.target.checked)} />
                Apply active template to <code>description</code>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={onlyEmptyDesc} onChange={(e) => setOnlyEmptyDesc(e.target.checked)} />
                Only fill products that have empty descriptions
              </label>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Preview template ({tpl.length} chars)</summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap">{tpl}</pre>
              </details>
            </>
          ) : (
            <p className="text-sm text-amber-600">
              No active template found. Set one in <a className="underline" href="/admin/description-template">Description Template</a>.
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Pricing & Plans</h2>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={pricingMode === "none"} onChange={() => setPricingMode("none")} />
              Don't touch plans
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={pricingMode === "percent"} onChange={() => setPricingMode("percent")} />
              Set <code>original</code> so each price shows a
              <input
                type="number"
                value={percentOff}
                onChange={(e) => setPercentOff(parseFloat(e.target.value) || 0)}
                className="w-16 rounded border px-1 py-0.5"
              />
              % discount
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={pricingMode === "markup"} onChange={() => setPricingMode("markup")} />
              Set <code>original</code> = price × (1 +
              <input
                type="number"
                value={markupPct}
                onChange={(e) => setMarkupPct(parseFloat(e.target.value) || 0)}
                className="w-16 rounded border px-1 py-0.5"
              />
              %)
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" checked={pricingMode === "json"} onChange={() => setPricingMode("json")} />
              <span className="flex-1">
                Replace plans with this JSON array (applied to all selected):
                <textarea
                  value={bulkPlansJson}
                  onChange={(e) => setBulkPlansJson(e.target.value)}
                  rows={5}
                  placeholder='[{"period":"1 Month","price":"৳350","original":"৳550"}]'
                  className="mt-1 w-full rounded border bg-background p-2 font-mono text-xs"
                />
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3 md:col-span-2">
          <h2 className="font-semibold">Delivery & Warranty (optional)</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={setDelivery} onChange={(e) => setSetDelivery(e.target.checked)} />
              Set <code>delivery_time</code>:
              <input
                value={deliveryText}
                onChange={(e) => setDeliveryText(e.target.value)}
                className="flex-1 rounded border px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={setWarranty} onChange={(e) => setSetWarranty(e.target.checked)} />
              Set <code>warranty</code>:
              <input
                value={warrantyText}
                onChange={(e) => setWarrantyText(e.target.value)}
                className="flex-1 rounded border px-2 py-1"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Selector */}
      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 p-3 border-b">
          <SearchBar
            value={filter}
            onChange={setFilter}
            placeholder="Search products…"
            size="sm"
            showSubmit={false}
            className="flex-1 min-w-[200px]"
          />

          <button onClick={toggleAll} className="text-sm rounded border px-3 py-1.5 hover:bg-muted">
            {selected.size === filtered.length && filtered.length > 0 ? "Clear" : "Select all"}
          </button>
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <button
            onClick={runBulk}
            disabled={saving || selected.size === 0}
            className="ml-auto rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving
              ? progress
                ? `Updating ${progress.done}/${progress.total}…`
                : "Updating…"
              : `Apply to ${selected.size} product${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
        <div className="max-h-[480px] overflow-auto divide-y">
          {filtered.map((p) => (
            <label key={p.slug} className="flex items-center gap-3 p-3 text-sm hover:bg-muted/40 cursor-pointer">
              <input type="checkbox" checked={selected.has(p.slug)} onChange={() => toggleOne(p.slug)} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.slug} • {p.plans.length} plan{p.plans.length === 1 ? "" : "s"} •{" "}
                  {p.plans.map((pl) => `${pl.period}=${pl.price}`).join(", ") || "no plans"}
                </div>
              </div>
              {p.description.trim() ? (
                <span className="text-[10px] uppercase tracking-wide rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5">
                  has desc
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wide rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">
                  empty desc
                </span>
              )}
            </label>
          ))}
          {filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground">No products match.</div>}
        </div>
      </section>
    </div>
  );
}
