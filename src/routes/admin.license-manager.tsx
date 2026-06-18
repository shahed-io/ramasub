import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  KeyRound, Plus, Upload, Printer, RefreshCw, Search, Filter, Eye, EyeOff,
  Loader2, X, Pencil, UserPlus, FileText, Mail, MessageCircle, Package,
  ShieldCheck, CheckCircle2, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminLang } from "@/context/AdminLangContext";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/license-manager")({
  component: LicenseManagerPage,
});

type LicenseStatus = "available" | "assigned" | "revoked";

type LicenseData = {
  key?: string;
  type?: string; // License Key | Account | etc
  product_id?: string;
  product_name?: string;
  status?: LicenseStatus;
  customer_name?: string;
  customer_email?: string;
  order_ref?: string;
  delivery_number?: string;
  delivered_via?: "whatsapp" | "email" | "manual" | "";
  notes?: string;
  extra_info?: string;
  variant?: string;
};

type LicenseRow = {
  id: string;
  kind: string;
  data: LicenseData;
  is_active: boolean;
  created_at: string;
};

type ProductLite = { slug: string; name: string; emoji?: string | null; image_url?: string | null };

const STATUS_META: Record<LicenseStatus, { label: string; bg: string; text: string; ring: string }> = {
  available: { label: "Available", bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200" },
  assigned:  { label: "Assigned",  bg: "bg-violet-50",  text: "text-violet-600",  ring: "ring-violet-200" },
  revoked:   { label: "Revoked",   bg: "bg-rose-50",    text: "text-rose-600",    ring: "ring-rose-200" },
};

function statusOf(s?: string): LicenseStatus {
  const k = (s || "available").toLowerCase();
  return (STATUS_META[k as LicenseStatus] ? (k as LicenseStatus) : "available");
}

function maskKey(key?: string) {
  if (!key) return "—";
  const k = key.trim();
  if (k.length <= 8) return k;
  return `${k.slice(0, 4)}${"•".repeat(Math.max(8, k.length - 8))}${k.slice(-4)}`;
}

function LicenseManagerPage() {
  const { t } = useAdminLang();
  const [rows, setRows] = useState<LicenseRow[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<LicenseRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [presetSlug, setPresetSlug] = useState<string>("");
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const [licRes, prodRes] = await Promise.all([
      supabase.from("admin_records").select("*").eq("kind", "license_key").order("created_at", { ascending: false }),
      supabase.from("products").select("slug, name, emoji, image_url").order("name"),
    ]);
    if (licRes.error) toast.error(licRes.error.message);
    setRows(((licRes.data ?? []) as unknown) as LicenseRow[]);
    setProducts(((prodRes.data ?? []) as unknown) as ProductLite[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    let total = 0, available = 0, assigned = 0, whatsapp = 0, revoked = 0;
    rows.forEach((r) => {
      total++;
      const s = statusOf(r.data?.status);
      if (s === "available") available++;
      else if (s === "assigned") assigned++;
      else if (s === "revoked") revoked++;
      if ((r.data?.delivered_via || "").toLowerCase() === "whatsapp") whatsapp++;
    });
    return { total, available, assigned, whatsapp, revoked };
  }, [rows]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pTerm = productSearch.trim().toLowerCase();
    return rows.filter((r) => {
      const d = r.data ?? {};
      const s = statusOf(d.status);
      if (onlyAvailable && s !== "available") return false;
      if (statusFilter !== "all" && s !== statusFilter) return false;
      if (productFilter !== "all" && d.product_id !== productFilter) return false;
      if (pTerm && !(d.product_name || "").toLowerCase().includes(pTerm)) return false;
      if (!term) return true;
      const blob = [d.key, d.product_name, d.customer_name, d.customer_email, d.order_ref]
        .filter(Boolean).join(" ").toLowerCase();
      return blob.includes(term);
    });
  }, [rows, q, statusFilter, productFilter, productSearch, onlyAvailable]);

  const productStats = useMemo(() => {
    const m = new Map<string, { available: number; assigned: number; total: number }>();
    rows.forEach((r) => {
      const slug = r.data?.product_id || "__none__";
      const s = statusOf(r.data?.status);
      const cur = m.get(slug) || { available: 0, assigned: 0, total: 0 };
      cur.total++;
      if (s === "available") cur.available++;
      else if (s === "assigned") cur.assigned++;
      m.set(slug, cur);
    });
    return m;
  }, [rows]);

  const filteredProducts = useMemo(() => {
    const q2 = productQuery.trim().toLowerCase();
    if (!q2) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q2) || p.slug.toLowerCase().includes(q2));
  }, [products, productQuery]);

  const openBulkFor = (slug: string) => { setPresetSlug(slug); setBulkOpen(true); };
  const openAddFor = (slug: string) => { setPresetSlug(slug); setCreating(true); };

  const refresh = () => load(true);

  const removeRow = async (id: string) => {
    if (!confirm(t("Delete this license key?", "এই লাইসেন্স কী মুছবেন?"))) return;
    const { error } = await supabase.from("admin_records").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
          <Printer className="w-4 h-4" /> {t("Print", "প্রিন্ট")}
        </button>
        <button onClick={() => setBulkOpen(true)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
          <Upload className="w-4 h-4" /> Bulk Import
        </button>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-white text-sm font-semibold shadow-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95">
          <Plus className="w-4 h-4" /> {t("Add License", "লাইসেন্স যোগ")}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label={t("Total Keys", "মোট Keys")} value={String(stats.total)} tone="violet" />
        <StatCard label="Available" value={String(stats.available)} tone="emerald" />
        <StatCard label="Assigned" value={String(stats.assigned)} tone="sky" />
        <StatCard label="WhatsApp Delivered" value={String(stats.whatsapp)} tone="emerald" />
        <StatCard label="Revoked" value={String(stats.revoked)} tone="rose" />
      </div>

      {/* Products & License Stock */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center text-white">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900">{t("Products & License Stock", "প্রোডাক্ট ও License স্টক")}</div>
              <div className="text-[11px] text-slate-500">{t("All products — upload licenses or add new ones for each product", "সব প্রোডাক্ট — প্রতিটি প্রোডাক্টের জন্য লাইসেন্স আপলোড বা যোগ করুন")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder={t("Search products…", "প্রোডাক্ট খুঁজুন…")}
                className="w-56 h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-violet-300 text-sm outline-none"
              />
            </div>
            <button onClick={() => setAddProductOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95">
              <Plus className="w-4 h-4" /> {t("Add Product", "প্রোডাক্ট যোগ")}
            </button>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">{t("No products found.", "কোনো প্রোডাক্ট পাওয়া যায়নি।")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const st = productStats.get(p.slug) || { available: 0, assigned: 0, total: 0 };
              return (
                <div key={p.slug} className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 hover:border-violet-300 hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 grid place-items-center text-xl shrink-0 overflow-hidden">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <span>{p.emoji || "📦"}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{p.slug}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                    <div className="rounded-lg bg-emerald-50 py-1">
                      <div className="text-[9px] font-bold uppercase text-emerald-600">Avail</div>
                      <div className="text-sm font-extrabold text-emerald-700">{st.available}</div>
                    </div>
                    <div className="rounded-lg bg-violet-50 py-1">
                      <div className="text-[9px] font-bold uppercase text-violet-600">Used</div>
                      <div className="text-sm font-extrabold text-violet-700">{st.assigned}</div>
                    </div>
                    <div className="rounded-lg bg-slate-100 py-1">
                      <div className="text-[9px] font-bold uppercase text-slate-500">Total</div>
                      <div className="text-sm font-extrabold text-slate-700">{st.total}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <button onClick={() => openBulkFor(p.slug)} className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold">
                      <Upload className="w-3 h-3" /> {t("Upload Keys", "Keys আপলোড")}
                    </button>
                    <button onClick={() => openAddFor(p.slug)} title={t("Add single license", "একক লাইসেন্স")} className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setProductFilter(p.slug); setOnlyAvailable(false); }} title={t("Filter table", "ফিল্টার")} className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                      <Filter className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* Product search panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center text-white">
            <Package className="w-4 h-4" />
          </div>
          <div className="font-extrabold text-slate-900">{t("Find License by Product", "প্রোডাক্ট দিয়ে License খুঁজুন")}</div>
        </div>
        <p className="text-[11px] text-slate-500 mb-2">{t("Type a product name — see available licenses for that product", "প্রোডাক্টের নাম লিখুন — সেই প্রোডাক্টের available লাইসেন্সগুলো দেখুন")}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder={t("e.g. Netflix, Canva, Windows 11…", "যেমন: Netflix, Canva, Windows 11…")}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-violet-300 text-sm text-slate-900 outline-none"
            />
          </div>
          <label className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="accent-violet-600" />
            {t("Only Available", "শুধু Available")}
          </label>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search by Key, product, customer…", "Key, প্রোডাক্ট, কাস্টমার খুঁজুন…")}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-violet-300 text-sm text-slate-900 outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 px-1"><Filter className="w-4 h-4" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-xl bg-slate-50 border border-transparent text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-violet-300">
          <option value="all">{t("All Status", "সব Status")}</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="revoked">Revoked</option>
        </select>
        <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="h-10 px-3 rounded-xl bg-slate-50 border border-transparent text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-violet-300">
          <option value="all">{t("All Products", "সব প্রোডাক্ট")}</option>
          {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
        <button onClick={refresh} disabled={refreshing} className="w-10 h-10 grid place-items-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-[12px] text-slate-600">
          {visible.length} {t("license key shown", "টি license key দেখানো হচ্ছে")}
        </div>

        {loading ? (
          <div className="grid place-items-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            {rows.length === 0 ? t("No license keys yet.", "এখনো কোনো license key নেই।") : t("No matches.", "কিছু মেলেনি।")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <Th className="w-10"><input type="checkbox" className="accent-violet-600" /></Th>
                  <Th>Type</Th>
                  <Th>Key / Credentials</Th>
                  <Th>{t("Product", "প্রোডাক্ট")}</Th>
                  <Th>Status</Th>
                  <Th>{t("Customer / Order", "কাস্টমার / অর্ডার")}</Th>
                  <Th>{t("Delivery Number", "ডেলিভারি নম্বর")}</Th>
                  <Th className="text-right pr-4">Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => {
                  const d = r.data ?? {};
                  const s = statusOf(d.status);
                  const meta = STATUS_META[s];
                  const isRevealed = revealed[r.id];
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3"><input type="checkbox" className="accent-violet-600" /></td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 text-violet-600 ring-1 ring-violet-200">
                          <KeyRound className="w-3 h-3" /> {d.type || "License Key"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] text-slate-700">{isRevealed ? (d.key || "—") : maskKey(d.key)}</span>
                          {d.key && (
                            <button onClick={() => setRevealed((m) => ({ ...m, [r.id]: !m[r.id] }))} className="text-slate-400 hover:text-violet-600" title={isRevealed ? "Hide" : "Show"}>
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-slate-700">{d.product_name || <span className="text-slate-300">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}>
                          <CheckCircle2 className="w-3 h-3" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {d.customer_name ? (
                          <>
                            <div className="font-semibold text-slate-900">{d.customer_name}</div>
                            {d.order_ref && <div className="text-[11px] text-slate-500 font-mono">#{d.order_ref}</div>}
                          </>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-600">
                        {d.delivery_number || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1 pr-2">
                          <IconBtn title="Edit" onClick={() => setEditing(r)}><Pencil className="w-4 h-4" /></IconBtn>
                          <IconBtn title="Assign"><UserPlus className="w-4 h-4" /></IconBtn>
                          <IconBtn title="Invoice"><FileText className="w-4 h-4" /></IconBtn>
                          <IconBtn title="Email"><Mail className="w-4 h-4" /></IconBtn>
                          <IconBtn title="WhatsApp"><MessageCircle className="w-4 h-4" /></IconBtn>
                          <IconBtn title="Delete" onClick={() => removeRow(r.id)}><Trash2 className="w-4 h-4" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline panels */}
      {creating && !editing && (
        <AddLicensePanel
          products={products}
          presetSlug={presetSlug}
          onClose={() => { setCreating(false); setPresetSlug(""); }}
          onSaved={() => { setCreating(false); setPresetSlug(""); load(true); }}
        />
      )}
      {bulkOpen && (
        <BulkImportPanel
          products={products}
          presetSlug={presetSlug}
          onClose={() => { setBulkOpen(false); setPresetSlug(""); }}
          onSaved={() => { setBulkOpen(false); setPresetSlug(""); load(true); }}
        />
      )}
      {editing && (
        <LicenseFormModal
          row={editing}
          products={products}
          onClose={() => { setEditing(null); }}
          onSaved={() => { setEditing(null); load(true); }}
        />
      )}
      {addProductOpen && (
        <QuickAddProductModal
          onClose={() => setAddProductOpen(false)}
          onSaved={() => { setAddProductOpen(false); load(true); }}
        />
      )}
    </div>
  );
}

/* ============================== Building blocks ============================== */

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-3 font-bold ${className ?? ""}`}>{children}</th>;
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={title} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50">
      {children}
    </button>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "slate" | "emerald" | "rose" | "violet" | "sky" }) {
  const toneClass = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    violet: "text-violet-600",
    sky: "text-sky-600",
  }[tone];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
}

function LicenseFormModal({ row, products, presetSlug, onClose, onSaved }: { row: LicenseRow | null; products: ProductLite[]; presetSlug?: string; onClose: () => void; onSaved: () => void }) {
  const init = row?.data ?? {};
  const [key, setKey] = useState(init.key || "");
  const [type, setType] = useState(init.type || "License Key");
  const [productId, setProductId] = useState(init.product_id || presetSlug || "");
  const [status, setStatus] = useState<LicenseStatus>(statusOf(init.status));
  const [customerName, setCustomerName] = useState(init.customer_name || "");
  const [customerEmail, setCustomerEmail] = useState(init.customer_email || "");
  const [orderRef, setOrderRef] = useState(init.order_ref || "");
  const [deliveryNumber, setDeliveryNumber] = useState(init.delivery_number || "");
  const [notes, setNotes] = useState(init.notes || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!key.trim()) return toast.error("Key required");
    setSaving(true);
    const product = products.find((p) => p.slug === productId);
    const payload: LicenseData = {
      key: key.trim(),
      type,
      product_id: productId || undefined,
      product_name: product?.name,
      status,
      customer_name: customerName || undefined,
      customer_email: customerEmail || undefined,
      order_ref: orderRef || undefined,
      delivery_number: deliveryNumber || undefined,
      notes: notes || undefined,
    };
    let error;
    if (row) {
      ({ error } = await supabase.from("admin_records").update({ data: payload }).eq("id", row.id));
    } else {
      ({ error } = await supabase.from("admin_records").insert({ kind: "license_key", data: payload, is_active: true }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(row ? "Updated" : "License added");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-fuchsia-50">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-violet-600" />
            <h2 className="text-base font-extrabold text-slate-900">{row ? "Edit License" : "Add License"}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/70"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm max-h-[70vh] overflow-y-auto">
          <Field label="Key / Credentials"><textarea value={key} onChange={(e) => setKey(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[12px] outline-none focus:border-violet-300" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300"><option>License Key</option><option>Account</option><option>Activation Code</option><option>Gift Card</option></select></Field>
            <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as LicenseStatus)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300"><option value="available">Available</option><option value="assigned">Assigned</option><option value="revoked">Revoked</option></select></Field>
          </div>
          <Field label="Product"><select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300"><option value="">— Select product —</option>{products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer Name"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300" /></Field>
            <Field label="Customer Email"><input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order Ref"><input value={orderRef} onChange={(e) => setOrderRef(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300" /></Field>
            <Field label="Delivery Number"><input value={deliveryNumber} onChange={(e) => setDeliveryNumber(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300" /></Field>
          </div>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-300" /></Field>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
          <button onClick={onClose} className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {row ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkImportModal({ products, presetSlug, onClose, onSaved }: { products: ProductLite[]; presetSlug?: string; onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState(presetSlug || "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const keys = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (!keys.length) return toast.error("Paste keys, one per line");
    const product = products.find((p) => p.slug === productId);
    setBusy(true);
    const payload = keys.map((k) => ({
      kind: "license_key",
      is_active: true,
      data: { key: k, type: "License Key", status: "available", product_id: productId || undefined, product_name: product?.name },
    }));
    const { error } = await supabase.from("admin_records").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${keys.length} keys imported`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-fuchsia-50">
          <div className="flex items-center gap-2"><Upload className="w-5 h-5 text-violet-600" /><h2 className="text-base font-extrabold text-slate-900">Bulk Import</h2></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/70"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Field label="Product"><select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300"><option value="">— Select product —</option>{products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></Field>
          <Field label="Keys (one per line)"><textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[12px] outline-none focus:border-violet-300" /></Field>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
          <button onClick={onClose} className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={run} disabled={busy} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function QuickAddProductModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [emoji, setEmoji] = useState("📦");
  const [category, setCategory] = useState("License");
  const [busy, setBusy] = useState(false);
  const [slugDirty, setSlugDirty] = useState(false);

  const finalSlug = slug.trim() || slugify(name);

  const save = async () => {
    if (!name.trim()) return toast.error("Name required");
    if (!finalSlug) return toast.error("Slug required");
    setBusy(true);
    const { error } = await supabase.from("products").insert({
      slug: finalSlug,
      name: name.trim(),
      emoji,
      category,
      is_active: true,
      stock_status: "in_stock",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Product added");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-fuchsia-50">
          <div className="flex items-center gap-2"><Package className="w-5 h-5 text-violet-600" /><h2 className="text-base font-extrabold text-slate-900">Add Product</h2></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/70"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Field label="Product Name">
            <input value={name} onChange={(e) => { setName(e.target.value); if (!slugDirty) setSlug(slugify(e.target.value)); }} placeholder="e.g. Netflix Premium" className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300" />
          </Field>
          <Field label="Slug (URL key)">
            <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugDirty(true); }} placeholder="netflix-premium" className="w-full h-10 px-3 rounded-xl border border-slate-200 font-mono text-[12px] outline-none focus:border-violet-300" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Emoji"><input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300" /></Field>
            <Field label="Category"><input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 outline-none focus:border-violet-300" /></Field>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
          <button onClick={onClose} className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================== Inline panels (screenshot design) ============================== */

const KEY_TYPES: { value: string; label: string; hint: string }[] = [
  { value: "License Key", label: "🔑 License Key", hint: "Single activation key (Windows, Office, etc.)" },
  { value: "Account", label: "👤 Account", hint: "Email & password style credential" },
  { value: "Activation Code", label: "🎟️ Activation Code", hint: "Short redemption / activation code" },
  { value: "Gift Card", label: "🎁 Gift Card", hint: "Gift card / voucher code" },
];

function PanelShell({ accent = "violet", title, icon, right, children }: { accent?: "violet" | "amber"; title: React.ReactNode; icon: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  const bar = accent === "amber" ? "bg-amber-500" : "bg-violet-500";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className={`w-1 h-5 rounded ${bar}`} />
          <span className="inline-flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
            {icon} {title}
          </span>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AddLicensePanel({ products, presetSlug, onClose, onSaved }: { products: ProductLite[]; presetSlug?: string; onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState(presetSlug || "");
  const [keyType, setKeyType] = useState("License Key");
  const [key, setKey] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [variant, setVariant] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = KEY_TYPES.find((k) => k.value === keyType);

  const save = async () => {
    if (!productId) return toast.error("প্রোডাক্ট বেছে নিন");
    if (!key.trim()) return toast.error("Key দিন");
    setBusy(true);
    const product = products.find((p) => p.slug === productId);
    const payload: LicenseData = {
      key: key.trim(),
      type: keyType,
      product_id: productId,
      product_name: product?.name,
      status: "available",
      extra_info: extraInfo || undefined,
      variant: variant || undefined,
    };
    const { error } = await supabase.from("admin_records").insert({ kind: "license_key", data: payload, is_active: true });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("License added");
    onSaved();
  };

  return (
    <PanelShell title={<>নতুন License Key যোগ করুন</>} icon={<Plus className="w-4 h-4 text-violet-600" />}>
      <div className="grid md:grid-cols-2 gap-4">
        <PanelField label="প্রোডাক্ট" required>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-violet-400 text-sm">
            <option value="">— প্রোডাক্ট বেছে নিন —</option>
            {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        </PanelField>
        <PanelField label="Key Type" required hint={meta?.hint}>
          <select value={keyType} onChange={(e) => setKeyType(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-violet-400 text-sm">
            {KEY_TYPES.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </PanelField>
      </div>

      <div className="mt-4">
        <PanelField label="License Key / Value" required>
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-violet-400 text-sm font-mono" />
        </PanelField>
      </div>

      <div className="mt-4">
        <PanelField label="Extra Info (Optional)">
          <textarea value={extraInfo} onChange={(e) => setExtraInfo(e.target.value)} rows={3} placeholder="অতিরিক্ত তথ্য (যদি থাকে)…" className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:border-violet-400 text-sm" />
        </PanelField>
      </div>

      <div className="mt-4">
        <PanelField
          label={<span className="inline-flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>Variant / Option (Optional)</span>}
          hint="যেমন: 1 Year, 5 Devices, Personal"
        >
          <input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="যে option-এর জন্য এই key — যেমন: 1 Year" className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-violet-400 text-sm" />
          <p className="text-[11px] text-slate-500 mt-1.5">কাস্টমার যখন এই option-এ অর্ডার করবেন, তখন সিস্টেম এই key-টাই অটো ডেলিভার করবে।</p>
        </PanelField>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full text-white text-sm font-bold shadow bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save License
        </button>
        <button onClick={onClose} className="h-11 px-5 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">বাতিল</button>
      </div>
    </PanelShell>
  );
}

function BulkImportPanel({ products, presetSlug, onClose, onSaved }: { products: ProductLite[]; presetSlug?: string; onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState(presetSlug || "");
  const [keyType, setKeyType] = useState("License Key");
  const [variant, setVariant] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const keys = useMemo(() => text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean), [text]);

  const onFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return toast.error("ফাইল 8MB এর বেশি");
    const txt = await file.text();
    setText((prev) => (prev ? prev.replace(/\s+$/, "") + "\n" : "") + txt);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const run = async () => {
    if (!productId) return toast.error("প্রোডাক্ট বেছে নিন");
    if (!keys.length) return toast.error("কোনো key পাওয়া যায়নি");
    setBusy(true);
    const product = products.find((p) => p.slug === productId);
    const payload = keys.map((k) => ({
      kind: "license_key",
      is_active: true,
      data: { key: k, type: keyType, status: "available", product_id: productId, product_name: product?.name, variant: variant || undefined },
    }));
    const { error } = await supabase.from("admin_records").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${keys.length} keys imported`);
    onSaved();
  };

  return (
    <PanelShell
      accent="amber"
      title={<>Bulk License Import</>}
      icon={<Upload className="w-4 h-4 text-amber-600" />}
      right={
        <button onClick={() => toast.info("AI Smart Import coming soon")} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          ✨ AI Smart Import
        </button>
      }
    >
      <p className="text-[12px] text-slate-500 mb-3">প্রতি লাইনে একটি করে key লিখুন, অথবা CSV/TXT ফাইল আপলোড করুন।</p>

      <div className="grid md:grid-cols-2 gap-4">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-amber-400 text-sm">
          <option value="">— প্রোডাক্ট বেছে নিন —</option>
          {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
        <select value={keyType} onChange={(e) => setKeyType(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-amber-400 text-sm">
          {KEY_TYPES.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </div>

      <div className="mt-4">
        <div className="text-[12px] font-semibold text-slate-700 mb-1.5 inline-flex items-center gap-1">
          <span className="text-violet-500">🏷️</span> Variant / Option (Optional) <span className="text-slate-400 font-normal">— সব key এই option-এ লাগু হবে</span>
        </div>
        <input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="যেমন: 1 Year, 5 Devices, Personal (খালি রাখলে কোনো option থাকবে না)" className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-amber-400 text-sm" />
      </div>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 cursor-pointer hover:border-amber-400 hover:bg-amber-50/40"
      >
        <span className="inline-flex items-center gap-2 text-sm text-slate-600">
          <FileText className="w-4 h-4 text-slate-500" /> CSV বা TXT ফাইল আপলোড করুন
        </span>
        <span className="text-[11px] text-slate-400">.csv, .txt · সর্বোচ্চ 8MB</span>
        <input type="file" accept=".csv,.txt,text/plain,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
      </label>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={"XXXXX-XXXXX-XXXXX-XXXXX\nYYYYY-YYYYY-YYYYY-YYYYY\nZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ\n…"}
        className="mt-3 w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-[12px] outline-none focus:border-amber-400 bg-white"
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="text-[12px] text-slate-500"><span className="font-bold text-slate-900">{keys.length}</span> টি key পাওয়া গেছে</div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">বাতিল</button>
          <button onClick={run} disabled={busy || !keys.length} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-white text-sm font-bold shadow bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import করুন
          </button>
        </div>
      </div>
    </PanelShell>
  );
}

function PanelField({ label, required, hint, children }: { label: React.ReactNode; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-slate-700">
        {label}{required && <span className="text-rose-500"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </label>
  );
}

