import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
 Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, Save, X, Eye, EyeOff,
 Sparkles, FileText, Database, Download, Upload, Search, Copy, Package,
 CheckCircle2, AlertCircle, Clock, Filter, Wand2, ImageIcon, Zap, RefreshCw,
 Tag, Settings, Search as SearchIcon, ListChecks, HelpCircle, Star,
 Truck, Shield, Layers, Hash, Link2, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminStatCard as PremiumStatCard } from "@/components/admin/AdminStatCard";
import { SearchBar } from "@/components/SearchBar";
import { fileToWebp, blobToWebp } from "@/lib/image-to-webp";

export const Route = createFileRoute("/admin/products")({
 component: AdminProducts,
});

type Plan = { label: string; price: number; original_price?: number; duration?: string; note?: string };
type StockStatus = "in_stock" | "out_of_stock" | "preorder";

type ProductType = "digital" | "license" | "account" | "subscription" | "service" | "physical";
type AccountType = "none" | "personal" | "shared" | "family" | "student" | "business";
type DeliveryType = "instant" | "manual" | "24h";
type AiCardStyle = "premium-pastel" | "premium-dark" | "glassmorphism" | "soft-aurora" | "dark-neon";
type CustomField = { label: string; type: "text" | "email" | "password" | "number"; required: boolean };
type FaqItem = { q: string; a: string };

type ProductMeta = {
 product_type?: ProductType;
 account_type?: AccountType;
 brand?: string;
 subcategory?: string;
 additional_categories?: string[];
 status?: "draft" | "published";
 tags?: string[];
 flags?: { featured?: boolean; digital?: boolean; flash_sale?: boolean; require_email?: boolean };
 sku?: string;
 stock_qty?: number | null;
 selling_price?: number;
 original_price?: number;
 cost_price?: number;
 discount_percent?: number;
 gallery?: string[];
 video_url?: string;
 ai_card_style?: AiCardStyle;
 delivery_type?: DeliveryType;
 download_link?: string;
 refund_policy?: string;
 what_you_get?: string[];
 faq?: FaqItem[];
 custom_fields?: CustomField[];
 seo_title?: string;
 meta_description?: string;
};

type Product = {
 slug: string;
 name: string;
 emoji: string;
 gradient: string;
 category: string;
 badge: string | null;
 tagline: string;
 description: string;
 short_description: string;
 delivery_time: string;
 warranty: string;
 features: string[];
 plans: Plan[];
 is_active: boolean;
 stock_status: StockStatus;
 views: number;
 sort_order: number;
 image_url: string;
 meta?: ProductMeta;
};

const empty: Product = {
 slug: "", name: "", emoji: "📦", gradient: "from-primary to-primary",
 category: "", badge: null, tagline: "", description: "",
 short_description: "",
 delivery_time: "Instant / 24 hours", warranty: "",
 features: [], plans: [{ label: "1 Month", price: 0, duration: "1 month" }],
 is_active: true, stock_status: "in_stock", views: 0, sort_order: 0, image_url: "",
 meta: {
 product_type: "digital",
 account_type: "none",
 status: "published",
 flags: { featured: false, digital: true, flash_sale: false, require_email: false },
 delivery_type: "instant",
 ai_card_style: "glassmorphism",
 stock_qty: null,
 },
};

const STOCK_LABELS: Record<StockStatus, { label: string; bn: string; cls: string; icon: typeof CheckCircle2 }> = {
 in_stock: { label: "In stock", bn: "স্টকে আছে", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: CheckCircle2 },
 out_of_stock: { label: "Out of stock", bn: "স্টক শেষ", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: AlertCircle },
 preorder: { label: "Pre-order", bn: "প্রি-অর্ডার", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
};

function lowestPrice(p: Product): { price: number; original?: number } {
 if (!p.plans?.length) return { price: 0 };
 const sorted = [...p.plans].sort((a, b) => a.price - b.price);
 return { price: sorted[0].price, original: sorted[0].original_price };
}

function AdminProducts() {
 const [products, setProducts] = useState<Product[]>([]);
 const [loading, setLoading] = useState(true);
 const [editing, setEditing] = useState<Product | null>(null);
 const [isNew, setIsNew] = useState(false);
 const [selected, setSelected] = useState<Set<string>>(new Set());
 const [query, setQuery] = useState("");
 const [catFilter, setCatFilter] = useState("all");
 const [stockFilter, setStockFilter] = useState<"all" | StockStatus>("all");
 const [sortBy, setSortBy] = useState<"order" | "views" | "name">("order");
 const [aiBusy, setAiBusy] = useState(false);
 const [webpBusy, setWebpBusy] = useState(false);
 const [webpProgress, setWebpProgress] = useState<{ done: number; total: number } | null>(null);
 const fileRef = useRef<HTMLInputElement>(null);

 const load = useCallback(async () => {
 setLoading(true);
 const { data, error } = await supabase
 .from("products")
 .select("*")
 .order("sort_order", { ascending: true })
 .order("name", { ascending: true });
 if (error) toast.error(error.message);
 setProducts((data ?? []) as unknown as Product[]);
 setLoading(false);
 }, []);

 useEffect(() => { load(); }, [load]);

 const categories = useMemo(() => {
 const s = new Set(products.map((p) => p.category).filter(Boolean));
 return ["all", ...Array.from(s)];
 }, [products]);

 const filtered = useMemo(() => {
 let arr = products.filter((p) => {
 if (catFilter !== "all" && p.category !== catFilter) return false;
 if (stockFilter !== "all" && p.stock_status !== stockFilter) return false;
 if (query) {
 const q = query.toLowerCase();
 if (!p.name.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
 }
 return true;
 });
 if (sortBy === "views") arr = [...arr].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
 else if (sortBy === "name") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
 return arr;
 }, [products, query, catFilter, stockFilter, sortBy]);

 const stats = useMemo(() => ({
 total: products.length,
 inStock: products.filter((p) => p.stock_status === "in_stock").length,
 outOfStock: products.filter((p) => p.stock_status === "out_of_stock").length,
 preorder: products.filter((p) => p.stock_status === "preorder").length,
 }), [products]);

 const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.slug));
 const toggleAll = () => {
 if (allChecked) setSelected(new Set());
 else setSelected(new Set(filtered.map((p) => p.slug)));
 };
 const toggleOne = (slug: string) => {
 const next = new Set(selected);
 if (next.has(slug)) next.delete(slug); else next.add(slug);
 setSelected(next);
 };

 const remove = async (slug: string) => {
 if (!confirm("এই পণ্যটি মুছবেন?")) return;
 const { error } = await supabase.from("products").delete().eq("slug", slug);
 if (error) return toast.error(error.message);
 toast.success("পণ্য মুছে ফেলা হয়েছে");
 load();
 };

 const duplicate = async (p: Product) => {
 const newSlug = `${p.slug}-copy-${Date.now().toString(36).slice(-4)}`;
 const payload: Product = {
 ...p,
 slug: newSlug,
 name: `${p.name} (Copy)`,
 sort_order: (products.at(-1)?.sort_order ?? 0) + 10,
 views: 0,
 };
 const { error } = await supabase.from("products").insert(payload as never);
 if (error) return toast.error(error.message);
 toast.success("Duplicated");
 load();
 };

 const toggleActive = async (p: Product) => {
 const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("slug", p.slug);
 if (error) return toast.error(error.message);
 setProducts((prev) => prev.map((x) => x.slug === p.slug ? { ...x, is_active: !p.is_active } : x));
 };

 const setStock = async (slug: string, stock_status: StockStatus) => {
 const { error } = await supabase.from("products").update({ stock_status }).eq("slug", slug);
 if (error) return toast.error(error.message);
 setProducts((prev) => prev.map((x) => x.slug === slug ? { ...x, stock_status } : x));
 };

 const move = async (slug: string, dir: -1 | 1) => {
 const idx = products.findIndex((p) => p.slug === slug);
 const swap = idx + dir;
 if (idx < 0 || swap < 0 || swap >= products.length) return;
 const a = products[idx], b = products[swap];
 const aOrder = a.sort_order, bOrder = b.sort_order;
 const next = [...products];
 next[idx] = { ...a, sort_order: bOrder };
 next[swap] = { ...b, sort_order: aOrder };
 next.sort((x, y) => x.sort_order - y.sort_order);
 setProducts(next);
 const [r1, r2] = await Promise.all([
 supabase.from("products").update({ sort_order: bOrder }).eq("slug", a.slug),
 supabase.from("products").update({ sort_order: aOrder }).eq("slug", b.slug),
 ]);
 if (r1.error || r2.error) { toast.error("Reorder failed"); load(); }
 };

 const runAI = async (mode: "short" | "rich") => {
 if (selected.size === 0) {
 toast.error("আগে কিছু পণ্য সিলেক্ট করুন");
 return;
 }
 setAiBusy(true);
 const slugs = Array.from(selected);
 let ok = 0, fail = 0;
 for (const slug of slugs) {
 const p = products.find((x) => x.slug === slug);
 if (!p) continue;
 try {
 const { data, error } = await supabase.functions.invoke("product-ai", {
 body: { mode, product: { name: p.name, category: p.category, tagline: p.tagline, description: p.description, features: p.features } },
 });
 if (error) throw error;
 if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
 const patch: Partial<Product> = {};
 if (mode === "short") {
 const d = data as { tagline?: string; short_description?: string };
 if (d.tagline) patch.tagline = d.tagline;
 if (d.short_description) patch.short_description = d.short_description;
 } else {
 const d = data as { description?: string };
 if (d.description) patch.description = d.description;
 }
 const { error: upErr } = await supabase.from("products").update(patch).eq("slug", slug);
 if (upErr) throw upErr;
 ok++;
 } catch (e) {
 console.error(e);
 fail++;
 }
 }
 setAiBusy(false);
 if (ok) toast.success(`${ok}টি পণ্যের জন্য AI কপি তৈরি হয়েছে`);
 if (fail) toast.error(`${fail}টি পণ্যে ব্যর্থ হয়েছে`);
 load();
 };

 const exportBackup = () => {
 const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), products }, null, 2)], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `products-backup-${new Date().toISOString().slice(0, 10)}.json`;
 a.click();
 URL.revokeObjectURL(url);
 toast.success("ব্যাকআপ ডাউনলোড শুরু হয়েছে");
 };

 const importBackup = async (file: File) => {
 if (!confirm("Restore করলে স্ল্যাগ মিল থাকা পণ্যগুলো ওভাররাইট হবে। চালিয়ে যাবেন?")) return;
 try {
 const text = await file.text();
 const parsed = JSON.parse(text);
 const items: Product[] = Array.isArray(parsed) ? parsed : parsed.products;
 if (!Array.isArray(items)) throw new Error("Invalid backup file");
 let ok = 0;
 for (const p of items) {
 const { error } = await supabase.from("products").upsert(p as never, { onConflict: "slug" });
 if (!error) ok++;
 }
 toast.success(`${ok}টি পণ্য Restore হয়েছে`);
 load();
 } catch (e) {
 toast.error(e instanceof Error ? e.message : "Restore ব্যর্থ");
 }
 };

 // Convert every existing product image (image_url + meta.gallery[]) that
 // lives in our admin-uploads bucket to WebP. Uploads a new object, then
 // updates the DB row to point at it. Originals are left in storage as backup.
 const migrateAllToWebp = async () => {
 const BUCKET_MARK = "/storage/v1/object/public/admin-uploads/";
 const isCandidate = (u: string | undefined | null) => {
 if (!u || typeof u !== "string") return false;
 if (!u.includes(BUCKET_MARK)) return false;
 const low = u.toLowerCase().split("?")[0];
 return !low.endsWith(".webp") && !low.endsWith(".svg") && !low.endsWith(".gif");
 };
 const allUrls: string[] = [];
 for (const p of products) {
 if (isCandidate(p.image_url)) allUrls.push(p.image_url);
 for (const g of p.meta?.gallery ?? []) if (isCandidate(g)) allUrls.push(g);
 }
 const uniqueUrls = Array.from(new Set(allUrls));
 if (uniqueUrls.length === 0) { toast.success("সব ইমেজ আগে থেকেই WebP ✓"); return; }
 if (!confirm(`${uniqueUrls.length}টি ইমেজ WebP-তে কনভার্ট হবে। চালিয়ে যাবেন?`)) return;
 setWebpBusy(true);
 setWebpProgress({ done: 0, total: uniqueUrls.length });
 const urlMap = new Map<string, string>(); // old → new public URL
 let ok = 0, fail = 0;
 for (let i = 0; i < uniqueUrls.length; i++) {
 const oldUrl = uniqueUrls[i];
 try {
 const res = await fetch(oldUrl, { cache: "no-store" });
 if (!res.ok) throw new Error(`fetch ${res.status}`);
 const blob = await res.blob();
 const conv = await blobToWebp(blob, { quality: 0.85, maxDimension: 2000 });
 if (!conv.converted) { urlMap.set(oldUrl, oldUrl); ok++; continue; }
 const oldPath = oldUrl.split(BUCKET_MARK)[1]?.split("?")[0] ?? "";
 const dir = oldPath.includes("/") ? oldPath.slice(0, oldPath.lastIndexOf("/")) : "products";
 const base = (oldPath.split("/").pop() || "image").replace(/\.[^.]+$/, "");
 const newPath = `${dir}/${base}-${Date.now()}.webp`;
 const { error } = await supabase.storage.from("admin-uploads").upload(newPath, conv.blob, {
 cacheControl: "3600", upsert: false, contentType: "image/webp",
 });
 if (error) throw error;
 const { data } = supabase.storage.from("admin-uploads").getPublicUrl(newPath);
 urlMap.set(oldUrl, data.publicUrl);
 ok++;
 } catch (e) {
 console.error("webp migrate failed for", oldUrl, e);
 fail++;
 }
 setWebpProgress({ done: i + 1, total: uniqueUrls.length });
 }
 // Update DB rows
 let updated = 0;
 for (const p of products) {
 const newImg = p.image_url && urlMap.has(p.image_url) ? urlMap.get(p.image_url)! : p.image_url;
 const oldGallery = p.meta?.gallery ?? [];
 const newGallery = oldGallery.map((g) => urlMap.get(g) ?? g);
 const imgChanged = newImg !== p.image_url;
 const galChanged = oldGallery.some((g, i) => g !== newGallery[i]);
 if (!imgChanged && !galChanged) continue;
 const patch: Record<string, unknown> = {};
 if (imgChanged) patch.image_url = newImg;
 if (galChanged) patch.meta = { ...(p.meta ?? {}), gallery: newGallery };
 const { error } = await supabase.from("products").update(patch as never).eq("slug", p.slug);
 if (!error) updated++;
 }
 setWebpBusy(false);
 setWebpProgress(null);
 toast.success(`${ok}টি ইমেজ কনভার্ট ✓ — ${updated}টি প্রোডাক্ট আপডেট${fail ? ` • ${fail}টি ব্যর্থ` : ""}`);
 load();
 };

 return (
 <div>
 {/* Top bar — title + action buttons */}
 <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
 <span className="text-2xl">📦</span> পণ্য ম্যানেজমেন্ট
 </h1>
 <p className="text-sm text-muted-foreground mt-0.5">{products.length}টি পণ্য</p>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={() => runAI("short")}
 disabled={aiBusy || selected.size === 0}
 className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-white text-sm font-semibold shadow-[0_4px_14px_-4px_rgba(100,116,139,0.6)] disabled:opacity-60 disabled:cursor-not-allowed"
 style={{ background: "linear-gradient(135deg, #94a3b8 0%, #94a3b8 100%)" }}
 title={selected.size === 0 ? "আগে পণ্য সিলেক্ট করুন" : "AI Short Description"}
 >
 {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI Short Desc
 </button>
 <button
 onClick={() => runAI("rich")}
 disabled={aiBusy || selected.size === 0}
 className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-white text-sm font-semibold shadow-[0_4px_14px_-4px_rgba(100,116,139,0.6)] disabled:opacity-60 disabled:cursor-not-allowed"
 style={{ background: "linear-gradient(135deg, #94a3b8 0%, #94a3b8 100%)" }}
 >
 {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} AI Rich Desc + SEO
 </button>
 <BackupMenu onExport={exportBackup} onImport={() => fileRef.current?.click()} />
 <input
 ref={fileRef} type="file" accept="application/json" className="hidden"
 onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }}
 />
 <button
 onClick={migrateAllToWebp}
 disabled={webpBusy}
 className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
 title="সব প্রোডাক্ট ইমেজ WebP-তে কনভার্ট করুন"
 >
 {webpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
 {webpBusy && webpProgress ? `WebP ${webpProgress.done}/${webpProgress.total}` : "WebP কনভার্ট"}
 </button>
 <button
 onClick={() => { setEditing({ ...empty, name: " Price in Bangladesh", sort_order: (products.at(-1)?.sort_order ?? 0) + 10 }); setIsNew(true); }}
 className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
 >
 <Plus className="w-4 h-4" /> নতুন পণ্য
 </button>
 </div>
 </div>


 {/* Filters */}
 <div className="flex flex-wrap items-center gap-2 mb-4">
 <SearchBar
   value={query}
   onChange={setQuery}
   placeholder="পণ্য খুঁজুন…"
   size="md"
   showSubmit={false}
   className="flex-1 min-w-[220px]"
 />

 <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="h-10 px-3 rounded-xl border border-border bg-white text-sm">
 {categories.map((c) => <option key={c} value={c}>{c === "all" ? "সব ক্যাটাগরি" : c}</option>)}
 </select>
 <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)} className="h-10 px-3 rounded-xl border border-border bg-white text-sm">
 <option value="all">সব স্টক</option>
 <option value="in_stock">স্টকে আছে</option>
 <option value="out_of_stock">স্টক শেষ</option>
 <option value="preorder">প্রি-অর্ডার</option>
 </select>
 <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-10 px-3 rounded-xl border border-border bg-white text-sm">
 <option value="order">সর্ট: অর্ডার</option>
 <option value="views">সর্বমোট ভিউ</option>
 <option value="name">নাম</option>
 </select>
 {selected.size > 0 && (
 <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
 <Filter className="w-3 h-3" /> {selected.size} সিলেক্টেড
 </span>
 )}
 </div>

 {/* Table */}
 <div className="bg-white border border-border rounded-2xl overflow-hidden">
 {loading ? null : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm min-w-[900px]">
 <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
 <tr>
 <th className="px-3 py-3 w-10">
 <input type="checkbox" checked={allChecked} onChange={toggleAll} />
 </th>
 <th className="text-left px-3 py-3">পণ্য</th>
 <th className="text-left px-3 py-3">ক্যাটাগরি</th>
 <th className="text-left px-3 py-3">মূল্য</th>
 <th className="text-left px-3 py-3">স্টক</th>
 <th className="text-left px-3 py-3">ভিউ</th>
 <th className="text-left px-3 py-3">স্ট্যাটাস</th>
 <th className="text-right px-3 py-3 w-44">অ্যাকশন</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((p, i) => {
 const checked = selected.has(p.slug);
 const price = lowestPrice(p);
 const stock = STOCK_LABELS[p.stock_status] ?? STOCK_LABELS.in_stock;
 return (
 <tr key={p.slug} className={`border-t border-border hover:bg-slate-50/60 ${checked ? "bg-primary/5" : ""}`}>
 <td className="px-3 py-3">
 <input type="checkbox" checked={checked} onChange={() => toggleOne(p.slug)} />
 </td>
 <td className="px-3 py-3">
 <div className="flex items-center gap-3">
 {p.image_url ? (
 <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-200" />
 ) : (
 <div className="w-10 h-10 rounded-lg grid place-items-center text-lg bg-white/70 backdrop-blur-md ring-1 ring-slate-200 ring-1 ring-slate-200">{p.emoji}</div>
 )}
 <div className="min-w-0">
 <div className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
 {p.name}
 {p.badge && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{p.badge}</span>}
 </div>
 <div className="text-xs text-muted-foreground truncate">/{p.slug}</div>
 </div>
 </div>
 </td>
 <td className="px-3 py-3 text-slate-600">{p.category}</td>
 <td className="px-3 py-3">
 <div className="font-bold text-slate-800">৳{price.price.toLocaleString()}</div>
 {price.original && price.original > price.price && (
 <div className="text-xs text-muted-foreground line-through">৳{price.original.toLocaleString()}</div>
 )}
 </td>
 <td className="px-3 py-3">
 <select
 value={p.stock_status}
 onChange={(e) => setStock(p.slug, e.target.value as StockStatus)}
 className={`h-7 px-2 rounded-full text-[11px] font-semibold border ${stock.cls} cursor-pointer`}
 >
 <option value="in_stock">স্টকে আছে</option>
 <option value="out_of_stock">স্টক শেষ</option>
 <option value="preorder">প্রি-অর্ডার</option>
 </select>
 </td>
 <td className="px-3 py-3 text-slate-600">
 <span className="inline-flex items-center gap-1 text-xs"><Eye className="w-3 h-3" />{p.views ?? 0}</span>
 </td>
 <td className="px-3 py-3">
 <button
 onClick={() => toggleActive(p)}
 title={p.is_active ? "ক্লিক করে বন্ধ করুন (ওয়েবসাইটে দেখাবে না)" : "ক্লিক করে চালু করুন (ওয়েবসাইটে দেখাবে)"}
 aria-pressed={p.is_active}
 className={`inline-flex items-center gap-2 select-none transition-colors`}
 >
 <span
 className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
 >
 <span
 className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${p.is_active ? "translate-x-4" : "translate-x-0.5"}`}
 />
 </span>
 <span className={`text-xs font-medium ${p.is_active ? "text-emerald-700" : "text-slate-500"}`}>
 {p.is_active ? "On" : "Off"}
 </span>
 </button>
 </td>
 <td className="px-3 py-3">
 <div className="flex items-center justify-end gap-1">
 <IconBtn title="উপরে" onClick={() => move(p.slug, -1)} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></IconBtn>
 <IconBtn title="নিচে" onClick={() => move(p.slug, 1)} disabled={i === filtered.length - 1}><ArrowDown className="w-3.5 h-3.5" /></IconBtn>
 <IconBtn title="এডিট" onClick={() => { setEditing(p); setIsNew(false); }}><Pencil className="w-3.5 h-3.5" /></IconBtn>
 <IconBtn title="ডুপ্লিকেট" onClick={() => duplicate(p)}><Copy className="w-3.5 h-3.5" /></IconBtn>
 <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" title="দেখুন" className="w-8 h-8 grid place-items-center rounded-md border border-border hover:bg-secondary">
 <Eye className="w-3.5 h-3.5" />
 </a>
 <IconBtn title="মুছুন" onClick={() => remove(p.slug)} danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
 </div>
 </td>
 </tr>
 );
 })}
 {filtered.length === 0 && (
 <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">কোনো পণ্য পাওয়া যায়নি।</td></tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {editing && (
 <ProductEditor
 product={editing}
 isNew={isNew}
 onClose={() => setEditing(null)}
 onSaved={() => { setEditing(null); load(); }}
 />
 )}
 </div>
 );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof Package; label: string; value: number; tint: "slate" | "emerald" | "rose" | "amber" }) {
 const map = {
 slate: " text-slate-600 ring-slate-200",
 emerald: " text-slate-700 ring-slate-200",
 rose: " text-slate-700 ring-slate-200",
 amber: " text-slate-700 ring-slate-200",
 } as const;
 return (
 <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
 <div className={`w-11 h-11 rounded-xl grid place-items-center bg-gradient-to-br ${map[tint]} ring-1`}>
 <Icon className="w-5 h-5" />
 </div>
 <div>
 <div className="text-2xl font-bold text-slate-800 leading-none">{value}</div>
 <div className="text-xs text-muted-foreground mt-1">{label}</div>
 </div>
 </div>
 );
}

function BackupMenu({ onExport, onImport }: { onExport: () => void; onImport: () => void }) {
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => {
 if (!open) return;
 const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
 document.addEventListener("mousedown", h);
 return () => document.removeEventListener("mousedown", h);
 }, [open]);
 return (
 <div className="relative" ref={ref}>
 <button
 onClick={() => setOpen((v) => !v)}
 className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-white text-sm font-semibold shadow-[0_4px_14px_-4px_rgba(100,116,139,0.6)]"
 style={{ background: "linear-gradient(135deg, #94a3b8 0%, #94a3b8 100%)" }}
 >
 <Database className="w-4 h-4" /> Backups & Restore
 </button>
 {open && (
 <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-xl shadow-lg z-20 p-1">
 <button onClick={() => { onExport(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 text-left">
 <Download className="w-4 h-4 text-slate-600" /> ব্যাকআপ ডাউনলোড (.json)
 </button>
 <button onClick={() => { onImport(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50 text-left">
 <Upload className="w-4 h-4 text-slate-600" /> Restore (.json আপলোড)
 </button>
 </div>
 )}
 </div>
 );
}

function IconBtn({ children, onClick, disabled, danger, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean; title: string }) {
 return (
 <button
 title={title}
 onClick={onClick}
 disabled={disabled}
 className={`w-8 h-8 grid place-items-center rounded-md border border-border ${danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-secondary"} disabled:opacity-40 disabled:cursor-not-allowed`}
 >
 {children}
 </button>
 );
}

/* ============================== PRODUCT EDITOR (WordPress-style) ============================== */

const slugify = (s: string) =>
 s.toLowerCase().trim()
 .replace(/[^\w\s-]/g, "")
 .replace(/[\s_]+/g, "-")
 .replace(/^-+|-+$/g, "")
 .slice(0, 80);

type AiBusy = "" | "all" | "short" | "rich" | "seo" | "image-gen" | "image-up";
type TabId = "general" | "inventory" | "media" | "details" | "seo";

const TABS: { id: TabId; label: string; icon: string }[] = [
 { id: "general", label: "General", icon: "🍂" },
 { id: "inventory", label: "Inventory", icon: "🍯" },
 { id: "media", label: "Media", icon: "🖼️" },
 { id: "details", label: "Details", icon: "📋" },
 { id: "seo", label: "SEO", icon: "🔍" },
];

const PRODUCT_TYPES: { id: ProductType; label: string; icon: string }[] = [
 { id: "digital", label: "Digital Download", icon: "💾" },
 { id: "license", label: "License Key", icon: "🔑" },
 { id: "account", label: "Account Delivery", icon: "👤" },
 { id: "subscription", label: "Subscription", icon: "🔁" },
 { id: "service", label: "Service", icon: "🛎️" },
 { id: "physical", label: "Physical Product", icon: "📦" },
];

const ACCOUNT_TYPES: { id: AccountType; label: string; icon: string }[] = [
 { id: "none", label: "— নেই —", icon: "" },
 { id: "personal", label: "Personal", icon: "👤" },
 { id: "shared", label: "Shared", icon: "👥" },
 { id: "family", label: "Family", icon: "👪" },
 { id: "student", label: "Student", icon: "🎓" },
 { id: "business", label: "Business", icon: "🛍️" },
];

const DURATION_CHIPS = [
 "1 Month", "2 Months", "3 Months", "4 Months", "5 Months", "6 Months",
 "7 Months", "8 Months", "9 Months", "10 Months", "11 Months", "12 Months",
 "1 Year", "2 Years", "3 Years", "Lifetime", "Custom",
];


function ProductEditor({ product, isNew, onClose, onSaved }: { product: Product; isNew: boolean; onClose: () => void; onSaved: () => void }) {
 const initial: Product = { ...product, meta: { ...empty.meta, ...(product.meta ?? {}) } };
 const [form, setForm] = useState<Product>(initial);
 const [tab, setTab] = useState<TabId>("general");
 const [busy, setBusy] = useState(false);
 const [featuresList, setFeaturesList] = useState<string[]>(product.features?.length ? product.features : [""]);
 const [tagsText, setTagsText] = useState((product.meta?.tags ?? []).join(", "));
 const [addCats, setAddCats] = useState<string[]>(product.meta?.additional_categories ?? []);
 const [whatYouGet, setWhatYouGet] = useState<string[]>(product.meta?.what_you_get?.length ? product.meta.what_you_get : [""]);
 const [faq, setFaq] = useState<FaqItem[]>(product.meta?.faq ?? []);
 const [customFields, setCustomFields] = useState<CustomField[]>(product.meta?.custom_fields ?? []);
 const [gallery, setGallery] = useState<string[]>(product.meta?.gallery ?? []);
 const [ai, setAi] = useState<AiBusy>("");
 const [imagePrompt, setImagePrompt] = useState("");
  const [autoSlug, setAutoSlug] = useState(isNew);
  const [slugUnlocked, setSlugUnlocked] = useState(isNew);
 const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
 const fileRef = useRef<HTMLInputElement>(null);
 const galleryRef = useRef<HTMLInputElement>(null);
 const aiBusy = ai !== "";

 // Load category options from admin_records
 useEffect(() => {
   let active = true;
   (async () => {
     const { data } = await supabase
       .from("admin_records")
       .select("data")
       .eq("kind", "category")
       .eq("is_active", true)
       .order("sort_order", { ascending: true });
     if (!active) return;
     const names = (data ?? [])
       .map((r: { data: unknown }) => {
         const d = r.data as { name?: string } | null;
         return d?.name?.trim() ?? "";
       })
       .filter(Boolean);
     setCategoryOptions(Array.from(new Set(names)));
   })();
   return () => { active = false; };
 }, []);


 const set = <K extends keyof Product>(k: K, v: Product[K]) => setForm((f) => ({ ...f, [k]: v }));
 const setMeta = <K extends keyof ProductMeta>(k: K, v: ProductMeta[K]) =>
 setForm((f) => ({ ...f, meta: { ...(f.meta ?? {}), [k]: v } }));
 const meta = form.meta ?? {};

 // Auto slug from name
 useEffect(() => {
 if (autoSlug && form.name) set("slug", slugify(form.name));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [form.name, autoSlug]);

 // Auto discount % from selling/original
 useEffect(() => {
 const sp = Number(meta.selling_price ?? 0);
 const op = Number(meta.original_price ?? 0);
 if (op > 0 && sp > 0 && sp < op) {
 const pct = Math.round(((op - sp) / op) * 100);
 if (meta.discount_percent !== pct) setMeta("discount_percent", pct);
 } else if (meta.discount_percent !== 0) {
 setMeta("discount_percent", 0);
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [meta.selling_price, meta.original_price]);

 /* ---------- plans (packages) ---------- */
 const setPlan = (i: number, patch: Partial<Plan>) =>
 setForm((f) => ({ ...f, plans: f.plans.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
 const addPlan = () =>
 setForm((f) => ({ ...f, plans: [...f.plans, { label: `Package ${f.plans.length + 1}`, price: 0, duration: "" }] }));
 const removePlan = (i: number) => setForm((f) => ({ ...f, plans: f.plans.filter((_, idx) => idx !== i) }));

 /* ---------- AI ---------- */
 const callAi = async (mode: "short" | "rich" | "all" | "seo") => {
 if (!form.name.trim()) { toast.error("আগে Product Title লিখুন"); return; }
 setAi(mode);
 try {
 const { data, error } = await supabase.functions.invoke("product-ai", {
 body: { mode, product: { name: form.name, category: form.category, tagline: form.tagline, description: form.description, features: featuresList.filter(Boolean) } },
 });
 if (error) throw error;
 const d = data as Record<string, unknown> & { error?: string };
 if (d?.error) throw new Error(d.error);
 setForm((f) => {
 const next = { ...f };
 if (typeof d.tagline === "string") next.tagline = d.tagline;
 if (typeof d.short_description === "string") next.short_description = d.short_description;
 if (typeof d.description === "string") next.description = d.description;
 if (typeof d.seo_title === "string") next.meta = { ...(next.meta ?? {}), seo_title: d.seo_title };
 const metaDesc = typeof d.meta_description === "string" ? d.meta_description : (typeof d.seo_description === "string" ? d.seo_description : undefined);
 if (typeof metaDesc === "string") next.meta = { ...(next.meta ?? {}), meta_description: metaDesc };
 if (Array.isArray(d.tags)) next.meta = { ...(next.meta ?? {}), tags: d.tags as string[] };
 return next;
 });
 if (Array.isArray(d.features)) setFeaturesList(d.features as string[]);
 toast.success("AI কপি তৈরি হয়েছে ✨");
 } catch (e) {
 toast.error(e instanceof Error ? e.message : "AI generation failed");
 } finally {
 setAi("");
 }
 };

 /* ---------- Image upload ---------- */
 const uploadOne = async (file: File): Promise<string> => {
 if (file.size > 8 * 1024 * 1024) throw new Error("ফাইল 8MB-এর কম হতে হবে");
 // Auto-convert to WebP in the browser before upload (skips svg/gif/already-webp).
 const webpFile = await fileToWebp(file, { quality: 0.85, maxDimension: 2000 });
 const ext = webpFile.name.split(".").pop()?.toLowerCase() || "webp";
 const path = `products/${slugify(form.name) || "untitled"}-${Date.now()}.${ext}`;
 const { error } = await supabase.storage.from("admin-uploads").upload(path, webpFile, { cacheControl: "3600", upsert: false, contentType: webpFile.type || "image/webp" });
 if (error) throw error;
 const { data } = supabase.storage.from("admin-uploads").getPublicUrl(path);
 return data.publicUrl;
 };
 const onPickFile = async (file: File | undefined) => {
 if (!file) return;
 setAi("image-up");
 try { set("image_url", await uploadOne(file)); toast.success("ইমেজ আপলোড হয়েছে ✓"); }
 catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
 finally { setAi(""); }
 };
 const onPickGallery = async (files: FileList | null) => {
 if (!files?.length) return;
 setAi("image-up");
 try {
 const urls: string[] = [];
 for (const f of Array.from(files)) urls.push(await uploadOne(f));
 const next = [...gallery, ...urls];
 setGallery(next); setMeta("gallery", next);
 toast.success(`${urls.length}টি ইমেজ যোগ হয়েছে`);
 } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
 finally { setAi(""); }
 };

  const generateImage = async (style: AiCardStyle = "premium-pastel") => {
    if (!form.name.trim()) { toast.error("আগে Product Title লিখুন"); return; }
    setAi("image-gen");
    try {
      const { data, error } = await supabase.functions.invoke("product-ai", {
        body: { mode: "image", product: { name: form.name, category: form.category }, imagePrompt, style },
      });
      if (error) throw error;
      const d = data as { image?: string; error?: string };
      if (d?.error) throw new Error(d.error);
      if (!d.image) throw new Error("No image returned");
      const blob = await (await fetch(d.image)).blob();
      const file = new File([blob], `${slugify(form.name) || "product"}-ai-${Date.now()}.png`, { type: blob.type || "image/png" });
      set("image_url", await uploadOne(file));
      toast.success("AI ইমেজ তৈরি হয়েছে 🎨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image generation failed");
    } finally {
      setAi("");
    }
  };

 /* ---------- save ---------- */
 const save = async () => {
 if (!form.slug.trim() || !form.name.trim()) return toast.error("Title and slug are required");
 setBusy(true);
 const features = featuresList.map((s) => s.trim()).filter(Boolean);
 const tags = tagsText.split(",").map((s) => s.trim()).filter(Boolean);
 const additional_categories = addCats.map((s) => s.trim()).filter(Boolean);
 const what_you_get = whatYouGet.map((s) => s.trim()).filter(Boolean);
 const payload = {
 ...form,
 features,
 meta: {
 ...(form.meta ?? {}),
 tags, additional_categories, what_you_get,
 faq, custom_fields: customFields, gallery,
 },
 is_active: (form.meta?.status ?? "published") === "published" ? form.is_active : false,
 };
 const op = isNew
 ? supabase.from("products").insert(payload as never)
 : supabase.from("products").update(payload as never).eq("slug", form.slug);
 const { error } = await op;
 setBusy(false);
 if (error) return toast.error(error.message);
 toast.success(isNew ? "Product created" : "Product updated");
 onSaved();
 };

 /* ============================================================ RENDER */
 return (
   <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-2 md:p-4 bg-gradient-to-br from-violet-950/70 via-slate-900/60 to-fuchsia-950/70 backdrop-blur-md">
   <div className="relative rounded-2xl w-full max-w-3xl h-[96vh] md:h-[90vh] flex flex-col overflow-hidden bg-white/60 backdrop-blur-2xl border border-white/60 ring-1 ring-violet-300/40 shadow-[0_30px_80px_-20px_rgba(109,40,217,0.45)]" onClick={(e) => e.stopPropagation()}>
   {/* Ambient glow orbs */}
   <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-violet-400/30 blur-3xl" />
   <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl" />
   <div className="pointer-events-none absolute top-1/3 right-1/4 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />

  {/* Header */}
  <div className="relative px-6 py-4 flex items-center justify-between border-b border-white/40 bg-white/30 backdrop-blur-xl">
  <h2 className="font-bold text-xl text-slate-900">{isNew ? "New Product" : "Edit Product"}</h2>
  <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg bg-white/50 hover:bg-violet-100/70 text-violet-700 border border-white/60"><X className="w-5 h-5" /></button>
  </div>

  {/* Tabs */}
  <div className="relative px-6 pt-3 border-b border-white/40 bg-white/20 backdrop-blur-xl">
  <div className="flex items-center gap-1 overflow-x-auto -mb-px">
  {TABS.map((t) => (
  <button
  key={t.id}
  onClick={() => setTab(t.id)}
  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 h-10 rounded-t-lg text-sm font-semibold border-b-2 transition ${
  tab === t.id
  ? "text-violet-700 border-violet-500 bg-white/70 backdrop-blur"
  : "text-slate-600 border-transparent hover:text-violet-700 hover:bg-white/40"
  }`}
  >
  <span>{t.icon}</span> {t.label}
  </button>
  ))}
  </div>
  </div>

  {/* Body */}
  <div className="relative flex-1 overflow-y-auto px-6 py-5 space-y-5">

 {tab === "general" && (
 <>
 {/* Product type */}
 <div>
 <Label>Product Type *</Label>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {PRODUCT_TYPES.map((t) => (
 <ChipBig key={t.id} active={meta.product_type === t.id} onClick={() => setMeta("product_type", t.id)}>
 <span>{t.icon}</span> {t.label}
 </ChipBig>
 ))}
 </div>
 </div>

 {/* Title */}
 <div>
 <div className="flex items-center justify-between mb-1.5">
   <Label>Product Title *</Label>
   <button
     type="button"
     onClick={() => callAi("all")}
     disabled={!!ai || !form.name.trim()}
     title="এক ক্লিকে Tagline, Short/Long Description, Features, SEO — সব AI দিয়ে তৈরি করুন"
     className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 shadow-md shadow-fuchsia-200 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
   >
     {ai === "all" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
     ✨ AI Auto-Fill All
   </button>
 </div>
 <input
 value={form.name}
 onChange={(e) => set("name", e.target.value)}
 onFocus={(e) => { if (isNew && e.currentTarget.value === " Price in Bangladesh") e.currentTarget.setSelectionRange(0, 0); }}
 placeholder="e.g. Windows 11 Pro License Key"
 className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
 />
 <p className="text-[11px] text-slate-500 mt-1">💡 ডিফল্টভাবে " Price in Bangladesh" বসানো আছে — প্রোডাক্ট নাম সামনে লিখুন বা পুরোটা মুছে ফেলুন।</p>
 </div>

 {/* Subtitle */}
 <div>
 <Label>📝 Subtitle / Custom Tagline <span className="text-slate-500 font-normal">(ঐচ্ছিক)</span></Label>
 <input
 value={form.tagline}
 onChange={(e) => set("tagline", e.target.value)}
 placeholder="যেমন: Best quality guaranteed, Instant delivery..."
 className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
 />
 <p className="text-[11px] text-slate-500 mt-1">প্রোডাক্ট টাইটেলের নিচে এই ছোট টেক্সটটি দেখাবে</p>
 </div>

 {/* Account type */}
 <div>
 <Label>👤 অ্যাকাউন্ট টাইপ <span className="text-slate-500 font-normal">(প্রযোজ্য হলে)</span></Label>
 <div className="flex flex-wrap gap-2">
 {ACCOUNT_TYPES.map((t) => (
 <ChipBig key={t.id} active={(meta.account_type ?? "none") === t.id} onClick={() => setMeta("account_type", t.id)}>
 {t.icon && <span>{t.icon}</span>} {t.label}
 </ChipBig>
 ))}
 </div>
 </div>

 {/* Slug + Brand */}
 <div className="grid sm:grid-cols-2 gap-3">
 <div>
  <div className="flex items-center justify-between gap-2">
  <Label>Slug (URL) *</Label>
  <div className="flex items-center gap-2">
   {slugUnlocked && (
   <button type="button" onClick={() => setAutoSlug((v) => !v)} className="text-[11px] text-violet-700 font-bold hover:underline">
   ⟳ নাম থেকে রিজেনারেট
   </button>
   )}
   {!isNew && (
   <button
    type="button"
    onClick={() => { setSlugUnlocked((v) => !v); if (slugUnlocked) setAutoSlug(false); }}
    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition ${slugUnlocked ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-white/60 text-slate-600 border-slate-300 hover:border-violet-300 hover:text-violet-700"}`}
    title={slugUnlocked ? "Lock slug" : "Unlock to edit (warning: changes URL)"}
   >
    {slugUnlocked ? "🔓 Unlocked" : "🔒 Edit"}
   </button>
   )}
  </div>
  </div>
      <input
      value={form.slug}
      onChange={(e) => { setAutoSlug(false); set("slug", slugify(e.target.value)); }}
      placeholder="product-name-here"
      disabled={!slugUnlocked}
      className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 disabled:bg-white/30 disabled:text-slate-500 disabled:cursor-not-allowed"
      />
      {!isNew && slugUnlocked && (
      <p className="text-[11px] text-amber-700 mt-1">⚠️ Slug পরিবর্তন করলে পুরাতন URL আর কাজ করবে না (SEO প্রভাব)</p>
      )}
      </div>
      <div>
     <Label>Brand / Publisher</Label>
     <input
     value={meta.brand ?? ""}
     onChange={(e) => setMeta("brand", e.target.value)}
     placeholder="e.g. Microsoft, Adobe"
     className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400"
     />
     </div>
 </div>

 {/* Bullet points */}
 <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
 <div className="flex items-center justify-between mb-3">
 <Label className="!mb-0">📝 প্রোডাক্ট বিবরণ (বুলেট পয়েন্ট) <span className="text-slate-500 font-normal">(টাইটেলের নিচে দেখাবে)</span></Label>
 <div className="flex items-center gap-2">
 <AiBtnSm busy={ai === "short"} onClick={() => callAi("short")}>AI</AiBtnSm>
 <button onClick={() => setFeaturesList((l) => [...l, ""])} className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200">
 <Plus className="w-3 h-3" /> যোগ করুন
 </button>
 </div>
 </div>
 <div className="space-y-2">
 {featuresList.map((f, i) => (
 <div key={i} className="flex items-center gap-2">
 <span className="w-6 h-6 grid place-items-center rounded-full bg-slate-500 text-white text-[10px] shrink-0">●</span>
 <input
 value={f}
 onChange={(e) => setFeaturesList((l) => l.map((x, idx) => (idx === i ? e.target.value : x)))}
 onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setFeaturesList((l) => [...l, ""]); } }}
 placeholder={`বুলেট পয়েন্ট ${i + 1} লিখুন...`}
 className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 bg-white"
 />
 {featuresList.length > 1 && (
 <button onClick={() => setFeaturesList((l) => l.filter((_, idx) => idx !== i))} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-500 hover:bg-slate-50">
 <X className="w-4 h-4" />
 </button>
 )}
 </div>
 ))}
 </div>
 <p className="text-[11px] text-slate-500 mt-2">💡 Enter চাপলে নতুন বুলেট যোগ হবে। প্রোডাক্ট পেজে বুলেট লিস্ট হিসেবে দেখাবে।</p>
 </div>

 {/* Full description */}
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <Label className="!mb-0">Full Description</Label>
 <AiBtnSm busy={ai === "rich"} onClick={() => callAi("rich")}>AI Generate</AiBtnSm>
 </div>
 <textarea
 value={form.description}
 onChange={(e) => set("description", e.target.value)}
 rows={5}
 placeholder="Detailed product description..."
 className="w-full px-3.5 py-2.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
 />
 </div>

 {/* AI banner */}
 <button onClick={() => callAi("all")} disabled={aiBusy} className="w-full inline-flex items-center justify-between px-4 h-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-60">
 <span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4" /> 🎯 Demo দেখিয়ে AI Description লেখান</span>
 <span className="text-[11px]">▼ খুলুন</span>
 </button>

 {/* Categories */}
 <div className="grid sm:grid-cols-2 gap-3">
 <div>
 <Label>Primary Category</Label>
 <select
 value={categoryOptions.includes(form.category) || !form.category ? form.category : "__custom__"}
 onChange={(e) => {
 const v = e.target.value;
 if (v === "__custom__") return;
 set("category", v);
 }}
 className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-slate-400"
 >
 <option value="">— Select Category —</option>
 {categoryOptions.map((c) => (
 <option key={c} value={c}>{c}</option>
 ))}
 {form.category && !categoryOptions.includes(form.category) && (
 <option value={form.category}>{form.category} (custom)</option>
 )}
 </select>
 </div>
 <div>
 <Label>Subcategory</Label>
 <input
 value={meta.subcategory ?? ""}
 onChange={(e) => setMeta("subcategory", e.target.value)}
 placeholder="None"
 className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
 />
 </div>
 </div>

 <div>
 <Label>Additional Categories <span className="text-slate-500 font-normal">(একাধিক ক্যাটাগরিতে দেখাবে)</span></Label>
 {categoryOptions.length === 0 ? (
 <div className="text-xs text-slate-500 px-3 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50">
 কোনো ক্যাটাগরি পাওয়া যায়নি। Admin → Categories থেকে যোগ করুন।
 </div>
 ) : (
 <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-slate-200 bg-white min-h-[44px]">
 {categoryOptions.filter((c) => c !== form.category).map((c) => {
 const active = addCats.includes(c);
 return (
 <button
 type="button"
 key={c}
 onClick={() => setAddCats((prev) => active ? prev.filter((x) => x !== c) : [...prev, c])}
 className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
 active
 ? "bg-blue-600 text-white border-blue-600 shadow-sm"
 : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
 }`}
 >
 {active ? "✓ " : ""}{c}
 </button>
 );
 })}
 </div>
 )}
 <p className="text-[11px] text-slate-500 mt-1">ক্লিক করে সিলেক্ট/ডিসিলেক্ট করুন</p>
 </div>


 <div className="grid sm:grid-cols-2 gap-3">
 <div>
 <Label>Status</Label>
 <select
 value={meta.status ?? "published"}
 onChange={(e) => setMeta("status", e.target.value as "draft" | "published")}
 className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-white"
 >
 <option value="published">Published</option>
 <option value="draft">Draft</option>
 </select>
 </div>
  <div>
  <Label>Badge Label</Label>
  <select
  value={["", "🔥 Hot Deal", "✨ Just Launched", "💎 Premium Sale", "🏆 #1 Bestseller", "⏳ Limited Edition", "👑 Exclusive", "🥇 Editor's Choice", "⚡ Flash Deal", "🎁 Special Offer", "🚀 Trending Now"].includes(form.badge ?? "") ? (form.badge ?? "") : "__custom__"}
  onChange={(e) => {
    const v = e.target.value;
    if (v === "__custom__") { set("badge", form.badge && !["🔥 Hot Deal","✨ Just Launched","💎 Premium Sale","🏆 #1 Bestseller","⏳ Limited Edition","👑 Exclusive","🥇 Editor's Choice","⚡ Flash Deal","🎁 Special Offer","🚀 Trending Now"].includes(form.badge) ? form.badge : "Custom Badge"); }
    else { set("badge", v || null); }
  }}
  className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
  >
  <option value="">— None —</option>
  <option value="🔥 Hot Deal">🔥 Hot Deal</option>
  <option value="✨ Just Launched">✨ Just Launched</option>
  <option value="💎 Premium Sale">💎 Premium Sale</option>
  <option value="🏆 #1 Bestseller">🏆 #1 Bestseller</option>
  <option value="⏳ Limited Edition">⏳ Limited Edition</option>
  <option value="👑 Exclusive">👑 Exclusive</option>
  <option value="🥇 Editor's Choice">🥇 Editor's Choice</option>
  <option value="⚡ Flash Deal">⚡ Flash Deal</option>
  <option value="🎁 Special Offer">🎁 Special Offer</option>
  <option value="🚀 Trending Now">🚀 Trending Now</option>
  <option value="__custom__">✏️ Custom Badge…</option>
  </select>
  {form.badge && !["🔥 Hot Deal","✨ Just Launched","💎 Premium Sale","🏆 #1 Bestseller","⏳ Limited Edition","👑 Exclusive","🥇 Editor's Choice","⚡ Flash Deal","🎁 Special Offer","🚀 Trending Now"].includes(form.badge) && (
    <input
      value={form.badge ?? ""}
      onChange={(e) => set("badge", e.target.value || null)}
      placeholder="Custom badge text"
      maxLength={30}
      className="mt-2 w-full h-10 px-3.5 rounded-xl border border-violet-300 bg-white/70 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
    />
  )}
  </div>
 </div>

 <div>
 <Label>Product Tags <span className="text-slate-500 font-normal">(comma separated)</span></Label>
 <input
 value={tagsText}
 onChange={(e) => setTagsText(e.target.value)}
 placeholder="windows, license, digital..."
 className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
 />
 </div>

 {/* Flags */}
 <div className="flex flex-wrap items-center gap-4 pt-1">
 <FlagCheck label="⭐ Featured" checked={!!meta.flags?.featured} onChange={(v) => setMeta("flags", { ...(meta.flags ?? {}), featured: v })} />
 <FlagCheck label="📘 Digital" checked={!!meta.flags?.digital} onChange={(v) => setMeta("flags", { ...(meta.flags ?? {}), digital: v })} />
 <FlagCheck label="🔥 Flash Sale" checked={!!meta.flags?.flash_sale} onChange={(v) => setMeta("flags", { ...(meta.flags ?? {}), flash_sale: v })} />
 <FlagCheck label="📧 গ্রাহকের ইমেইল লাগবে" checked={!!meta.flags?.require_email} onChange={(v) => setMeta("flags", { ...(meta.flags ?? {}), require_email: v })} />
 </div>
 </>
 )}

 {tab === "inventory" && (
 <>
 {/* Packages */}
 <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
 <div className="flex items-center justify-between mb-3">
 <Label className="!mb-0">⏳ Duration & Pricing Plans <span className="text-slate-500 font-normal">(multiple packages)</span></Label>
 <button onClick={addPlan} className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200">
 <Plus className="w-3 h-3" /> Add Package
 </button>
 </div>
 <div className="space-y-3">
 {form.plans.map((p, i) => (
 <div key={i} className="border border-slate-200 rounded-xl p-3.5 bg-white">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-semibold text-slate-700">Package #{i + 1}</span>
 {form.plans.length > 1 && (
 <button onClick={() => removePlan(i)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-slate-500 hover:bg-slate-50"><X className="w-4 h-4" /></button>
 )}
 </div>
 <div className="text-xs font-semibold text-slate-600 mb-1.5">Duration</div>
 <div className="flex flex-wrap gap-1.5 mb-3">
 {DURATION_CHIPS.map((d) => {
   const presets = DURATION_CHIPS.filter((x) => x !== "Custom");
   const isCustomActive = d === "Custom" && !!p.duration && !presets.includes(p.duration);
   const active = d === "Custom" ? isCustomActive : p.duration === d;
   return (
     <button
       key={d}
       onClick={() => {
         if (d === "Custom") setPlan(i, { duration: isCustomActive ? p.duration : "", label: isCustomActive ? p.label : "" });
         else setPlan(i, { duration: d, label: d });
       }}
       className={`px-3 h-7 rounded-full text-xs font-semibold border transition ${
         active
           ? "bg-violet-600 text-white border-violet-600"
           : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
       }`}
     >{d}</button>
   );
 })}
 </div>
 {(() => {
   const presets = DURATION_CHIPS.filter((x) => x !== "Custom");
   const showCustom = !!p.duration && !presets.includes(p.duration);
   // also show empty input when user just clicked Custom (duration === "")
   const isEmptyCustom = p.duration === "" && p.label === "";
   if (!showCustom && !isEmptyCustom) return null;
   return (
     <div className="mb-3">
        <div className="text-xs font-semibold text-slate-600 mb-1.5">Enter custom duration</div>
        <input
          type="text"
          value={p.duration ?? ""}
          onChange={(e) => setPlan(i, { duration: e.target.value, label: e.target.value })}
          placeholder="e.g. 18 Months, 6 Weeks, 45 Days..."
         className="w-full h-10 px-3 rounded-xl border border-violet-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
         autoFocus
       />
     </div>
   );
 })()}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <div className="text-xs font-semibold text-slate-600 mb-1.5">Selling Price (৳) *</div>
 <input type="number" value={p.price || ""} onChange={(e) => setPlan(i, { price: Number(e.target.value) || 0 })} placeholder="0" className="w-full h-10 px-3 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 </div>
 <div>
 <div className="text-xs font-semibold text-slate-600 mb-1.5">Original Price (৳) <span className="text-slate-500">strikethrough</span></div>
 <input type="number" value={p.original_price ?? ""} onChange={(e) => setPlan(i, { original_price: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="w-full h-10 px-3 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 </div>
  </div>
  {(() => {
    const sp = Number(p.price) || 0;
    const op = Number(p.original_price) || 0;
    if (op > sp && sp > 0) {
      const pct = Math.round(((op - sp) / op) * 100);
      const save = op - sp;
      return (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow shadow-rose-500/30">
            🔻 -{pct}% OFF
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            💰 Save ৳{save.toLocaleString()}
           </span>
           <span className="text-[11px] text-slate-500">auto-calculated</span>
         </div>
       );
     }
     if (op > 0 && sp > 0 && op <= sp) {
       return <div className="mt-2 text-[11px] text-amber-700">⚠️ Original price must be higher than selling price</div>;
    }
    return null;
  })()}
 </div>
 ))}
 </div>
 </div>

 {/* Aggregate pricing */}
 <div className="grid sm:grid-cols-2 gap-3">
 <div>
 <Label>Selling Price (৳) *</Label>
 <input type="number" value={meta.selling_price ?? ""} onChange={(e) => setMeta("selling_price", Number(e.target.value) || 0)} placeholder="0.00" className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm" />
 </div>
 <div>
 <Label>Original / MRP (৳)</Label>
 <input type="number" value={meta.original_price ?? ""} onChange={(e) => setMeta("original_price", Number(e.target.value) || 0)} placeholder="0.00" className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm" />
 </div>
 <div>
 <Label>Discount % <span className="text-slate-500 font-normal">(auto-calculated)</span></Label>
 <input type="number" value={meta.discount_percent ?? 0} readOnly className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500" />
 </div>
 <div>
 <Label>Cost Price (৳) <span className="text-slate-500 font-normal">internal</span></Label>
 <input type="number" value={meta.cost_price ?? ""} onChange={(e) => setMeta("cost_price", Number(e.target.value) || 0)} placeholder="0.00" className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm" />
 </div>
 </div>

 <div className="border-t border-slate-100 pt-4">
 <h4 className="text-sm font-bold text-slate-800 mb-3">Stock & SKU</h4>
 <div className="grid sm:grid-cols-2 gap-3">
 <div>
 <Label>SKU</Label>
 <div className="flex gap-2">
 <input value={meta.sku ?? ""} onChange={(e) => setMeta("sku", e.target.value)} placeholder="AUTO-SKU" className="flex-1 h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 <button onClick={() => setMeta("sku", `SKU-${Date.now().toString(36).toUpperCase()}`)} className="w-11 h-11 grid place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><RefreshCw className="w-4 h-4" /></button>
 </div>
 </div>
 <div>
 <Label>Stock Quantity</Label>
 <input
 value={meta.stock_qty == null ? "" : meta.stock_qty}
 onChange={(e) => setMeta("stock_qty", e.target.value === "" ? null : Number(e.target.value))}
 placeholder="∞"
 className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
 />
 </div>
 </div>
 </div>
 </>
 )}

 {tab === "media" && (
 <>
 <div>
 <Label>Featured Image</Label>
 <div className="flex gap-3">
 <div
 className="relative w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 grid place-items-center overflow-hidden cursor-pointer hover:border-slate-300 shrink-0"
 onClick={() => fileRef.current?.click()}
 >
 {form.image_url ? (
 <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
 ) : (
 <ImageIcon className="w-6 h-6 text-slate-500" />
 )}
 </div>
 <div className="flex-1 space-y-2">
 <button onClick={() => fileRef.current?.click()} className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
 {ai === "image-up" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload Image
 </button>
 <input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="or paste image URL..." className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 </div>
 </div>
 <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onPickFile(e.target.files?.[0]); e.target.value = ""; }} />
 </div>

 {/* AI Card Generator */}
 <div className="border border-slate-200 rounded-2xl p-4 bg-white">
 <div className="flex items-center gap-3 mb-3">
 <div className="w-10 h-10 rounded-full grid place-items-center text-white shrink-0" style={{ background: "linear-gradient(135deg,#94a3b8,#94a3b8)" }}>
 <Wand2 className="w-5 h-5" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5">
 <span className="font-bold text-slate-900">AI Card Generator</span>
 <span className="text-[9px] font-bold tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-full">PREMIUM</span>
 </div>
 <div className="text-xs text-slate-500">AccessNow BD ব্র্যান্ডিংসহ প্রিমিয়াম প্রোডাক্ট কার্ড তৈরি করুন</div>
 </div>
 </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            💡 দুই ধরনের প্রিমিয়াম গ্লাস-কার্ড ডিজাইন — AccessNow BD ব্র্যান্ডিং, ওয়েবসাইট ও ফোন নম্বর সহ
          </div>

          <input value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Optional: describe the look..." className="mt-3 w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-slate-400" />

          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              { id: "premium-pastel", label: "Pastel Glass", emoji: "🌸", bg: "linear-gradient(135deg,#a78bfa 0%,#ec4899 50%,#f97316 100%)", shadow: "rgba(168,85,247,0.45)" },
              { id: "premium-dark", label: "Dark Luxe", emoji: "🌌", bg: "linear-gradient(135deg,#0f172a 0%,#4c1d95 60%,#9333ea 100%)", shadow: "rgba(30,41,59,0.7)" },
              { id: "soft-aurora", label: "Soft Aurora", emoji: "🌅", bg: "linear-gradient(135deg,#10b981 0%,#06b6d4 50%,#8b5cf6 100%)", shadow: "rgba(16,185,129,0.45)" },
              { id: "dark-neon", label: "Neon Edge", emoji: "⚡", bg: "linear-gradient(135deg,#0ea5e9 0%,#6366f1 50%,#ec4899 100%)", shadow: "rgba(99,102,241,0.5)" },
            ] as { id: AiCardStyle; label: string; emoji: string; bg: string; shadow: string }[]).map((s) => (
              <button
                key={s.id}
                onClick={() => generateImage(s.id)}
                disabled={aiBusy}
                className="group relative inline-flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-extrabold shadow-lg disabled:opacity-50 transition active:scale-[0.98] hover:brightness-110"
                style={{ background: s.bg, boxShadow: `0 10px 30px -10px ${s.shadow}`, textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
              >
                {ai === "image-gen" ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base leading-none">{s.emoji}</span>}
                <span className="drop-shadow-sm">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 text-center">✨ Powered by Nano Banana 2 · 1:1 square HD</div>
 </div>

 {/* Gallery */}
 <div>
 <Label>Gallery Images <span className="text-slate-500 font-normal">(multiple)</span></Label>
 <button onClick={() => galleryRef.current?.click()} className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
 <ImageIcon className="w-4 h-4" /> Add Gallery Images
 </button>
 <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onPickGallery(e.target.files); e.target.value = ""; }} />
 {gallery.length > 0 && (
 <div className="mt-3 grid grid-cols-4 gap-2">
 {gallery.map((u, i) => (
 <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
 <img src={u} alt="" className="absolute inset-0 w-full h-full object-cover" />
 <button onClick={() => { const next = gallery.filter((_, idx) => idx !== i); setGallery(next); setMeta("gallery", next); }} className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-black/60 text-white"><X className="w-3 h-3" /></button>
 </div>
 ))}
 </div>
 )}
 </div>

 <div>
 <Label>Video Preview URL</Label>
 <input value={meta.video_url ?? ""} onChange={(e) => setMeta("video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 </div>
 </>
 )}

 {tab === "details" && (
 <>
 <div className="grid sm:grid-cols-2 gap-3">
 <div>
 <Label>Delivery Type</Label>
 <select value={meta.delivery_type ?? "instant"} onChange={(e) => setMeta("delivery_type", e.target.value as DeliveryType)} className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm bg-white">
 <option value="instant">⚡ Instant Delivery</option>
 <option value="24h">🕐 Within 24 hours</option>
 <option value="manual">🤝 Manual Delivery</option>
 </select>
 </div>
 <div>
 <Label>Delivery Time</Label>
 <input value={form.delivery_time} onChange={(e) => set("delivery_time", e.target.value)} placeholder="Instant / 24 hours..." className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 </div>
 </div>

 <div>
 <Label>Download Link</Label>
 <input value={meta.download_link ?? ""} onChange={(e) => setMeta("download_link", e.target.value)} placeholder="https://..." className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 </div>

 <div>
 <Label>Warranty / Guarantee Note</Label>
 <input value={form.warranty} onChange={(e) => set("warranty", e.target.value)} placeholder="e.g. 1 Year Genuine Warranty" className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 </div>

 <div>
 <Label>Refund Policy Note</Label>
 <input value={meta.refund_policy ?? ""} onChange={(e) => setMeta("refund_policy", e.target.value)} placeholder="e.g. No refund after activation" className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 </div>

 {/* What you get */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <Label className="!mb-0">What You Get</Label>
 <button onClick={() => setWhatYouGet((l) => [...l, ""])} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:underline"><Plus className="w-3 h-3" /> Add</button>
 </div>
 <div className="space-y-2">
 {whatYouGet.map((item, i) => (
 <div key={i} className="flex items-center gap-2">
 <input value={item} onChange={(e) => setWhatYouGet((l) => l.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder={`Item ${i + 1}`} className="flex-1 h-10 px-3 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 <button onClick={() => setWhatYouGet((l) => l.filter((_, idx) => idx !== i))} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-500 hover:bg-slate-50"><X className="w-4 h-4" /></button>
 </div>
 ))}
 </div>
 </div>

 {/* FAQ */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <Label className="!mb-0">FAQ</Label>
 <button onClick={() => setFaq((l) => [...l, { q: "", a: "" }])} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:underline"><Plus className="w-3 h-3" /> Add</button>
 </div>
 <div className="space-y-3">
 {faq.map((it, i) => (
 <div key={i} className="border border-slate-200 rounded-xl p-3">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-semibold text-slate-700">FAQ #{i + 1}</span>
 <button onClick={() => setFaq((l) => l.filter((_, idx) => idx !== i))} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-slate-500 hover:bg-slate-50"><X className="w-4 h-4" /></button>
 </div>
 <input value={it.q} onChange={(e) => setFaq((l) => l.map((x, idx) => (idx === i ? { ...x, q: e.target.value } : x)))} placeholder="Question" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 mb-2" />
 <textarea value={it.a} onChange={(e) => setFaq((l) => l.map((x, idx) => (idx === i ? { ...x, a: e.target.value } : x)))} placeholder="Answer" rows={2} className="w-full px-3 py-2 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 </div>
 ))}
 </div>
 </div>

 {/* Custom fields */}
 <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
 <div className="flex items-center justify-between mb-2">
 <div>
 <Label className="!mb-0">📋 অর্ডার কাস্টম ফিল্ড</Label>
 <p className="text-[11px] text-slate-500 mt-0.5">অর্ডার করার সময় গ্রাহক কী তথ্য দেবে (ইমেইল, পাসওয়ার্ড ইত্যাদি) তা নির্ধারণ করুন</p>
 </div>
 <button onClick={() => setCustomFields((l) => [...l, { label: "", type: "text", required: false }])} className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200">
 <Plus className="w-3 h-3" /> ফিল্ড যোগ করুন
 </button>
 </div>
 {customFields.length === 0 ? (
 <div className="text-center text-xs text-slate-500 py-6 border-2 border-dashed border-slate-200 rounded-xl">কোনো কাস্টম ফিল্ড নেই</div>
 ) : (
 <div className="space-y-2">
 {customFields.map((cf, i) => (
 <div key={i} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded-xl p-2">
 <input value={cf.label} onChange={(e) => setCustomFields((l) => l.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} placeholder="Field label" className="col-span-5 h-9 px-3 rounded-lg border border-slate-200 text-sm" />
 <select value={cf.type} onChange={(e) => setCustomFields((l) => l.map((x, idx) => (idx === i ? { ...x, type: e.target.value as CustomField["type"] } : x)))} className="col-span-3 h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white">
 <option value="text">Text</option>
 <option value="email">Email</option>
 <option value="password">Password</option>
 <option value="number">Number</option>
 </select>
 <label className="col-span-3 inline-flex items-center gap-1.5 text-xs text-slate-700">
 <input type="checkbox" checked={cf.required} onChange={(e) => setCustomFields((l) => l.map((x, idx) => (idx === i ? { ...x, required: e.target.checked } : x)))} /> Required
 </label>
 <button onClick={() => setCustomFields((l) => l.filter((_, idx) => idx !== i))} className="col-span-1 w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-500 hover:bg-slate-50 ml-auto"><X className="w-4 h-4" /></button>
 </div>
 ))}
 </div>
 )}
 </div>
 </>
 )}

 {tab === "seo" && (
 <>
 <button onClick={() => callAi("seo")} disabled={aiBusy} className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-500/30 disabled:opacity-60">
 {ai === "seo" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} ✨ AI দিয়ে SEO Title ও Meta Description অটো-জেনারেট করুন
 </button>

 <div>
 <Label>SEO Title <span className="text-slate-500 font-normal">(max 60 chars)</span></Label>
 <input maxLength={60} value={meta.seo_title ?? ""} onChange={(e) => setMeta("seo_title", e.target.value)} placeholder="SEO title..." className="w-full h-11 px-3.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 <div className="text-[11px] text-slate-500 mt-1">{(meta.seo_title ?? "").length}/60</div>
 </div>

 <div>
 <Label>Meta Description <span className="text-slate-500 font-normal">(max 160 chars)</span></Label>
 <textarea maxLength={160} rows={3} value={meta.meta_description ?? ""} onChange={(e) => setMeta("meta_description", e.target.value)} placeholder="Meta description..." className="w-full px-3.5 py-2.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
 <div className="text-[11px] text-slate-500 mt-1">{(meta.meta_description ?? "").length}/160</div>
 </div>

 {/* SEO checklist */}
 <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
 <h4 className="text-sm font-bold text-slate-800 mb-2">SEO Checklist</h4>
 <ul className="space-y-1.5 text-sm">
 <SeoCheck ok={(meta.seo_title?.length ?? 0) >= 10 && (meta.seo_title?.length ?? 0) <= 60}>Title between 10–60 chars</SeoCheck>
 <SeoCheck ok={(meta.meta_description?.length ?? 0) >= 50 && (meta.meta_description?.length ?? 0) <= 160}>Description 50–160 chars</SeoCheck>
 <SeoCheck ok={!!form.image_url}>Featured image set</SeoCheck>
 <SeoCheck ok={!!form.slug}>URL slug defined</SeoCheck>
 <SeoCheck ok={form.description.length > 50}>Full description added</SeoCheck>
 </ul>
 </div>
 </>
 )}
 </div>

  {/* Footer */}
  <div className="relative border-t border-white/40 px-6 py-3.5 flex items-center justify-between gap-3 bg-white/40 backdrop-blur-xl">
  <button onClick={onClose} className="h-11 px-6 rounded-full border border-white/60 bg-white/50 backdrop-blur text-sm font-semibold text-slate-700 hover:bg-white/80 transition">Cancel</button>
  <button onClick={save} disabled={busy || aiBusy} className="h-11 px-6 rounded-full text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-500/40 border border-white/30 transition">
  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
  {isNew ? "Add Product" : "Save Changes"}
  </button>
  </div>

 </div>
 </div>
 );
}

/* ============================== Small UI bits ============================== */

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
 return <div className={`text-xs font-bold text-slate-800 mb-1.5 ${className}`}>{children}</div>;
}

function ChipBig({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
   <button
   onClick={onClick}
   className={`inline-flex items-center justify-center gap-1.5 min-h-11 w-full px-2.5 py-2 rounded-xl text-[13px] leading-tight font-semibold border transition text-center break-words backdrop-blur ${
   active
    ? "border-violet-400 bg-gradient-to-br from-violet-500/90 to-fuchsia-500/90 text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-300/50"
    : "border-white/60 bg-white/50 text-slate-700 hover:bg-white/80 hover:border-violet-300"
   }`}
   >{children}</button>
  );
 }

function FlagCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
 return (
 <label className="inline-flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-slate-600" />
 <span className="text-sm text-slate-700">{label}</span>
 </label>
 );
}

function AiBtnSm({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: React.ReactNode }) {
 return (
 <button onClick={onClick} disabled={busy} className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-bold disabled:opacity-60">
 {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
 {children}
 </button>
 );
}

function SeoCheck({ ok, children }: { ok: boolean; children: React.ReactNode }) {
 return (
 <li className="flex items-center gap-2 text-slate-600">
 <span className={`w-4 h-4 rounded-full grid place-items-center text-[10px] font-bold ${ok ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-500"}`}>{ok ? "✓" : "○"}</span>
 {children}
 </li>
 );
}

