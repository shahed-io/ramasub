import { useEffect, useMemo, useState } from "react";
import { Download, Search, Image as ImageIcon, Loader2, ExternalLink, Copy, Check, DownloadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";

type Row = {
  slug: string;
  name: string;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
};

function extFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
    return m ? m[1].toLowerCase() : "jpg";
  } catch {
    const m = url.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
    return m ? m[1].toLowerCase() : "jpg";
  }
}

async function downloadOne(url: string, filename: string) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
}

export function ProductMediaGallery() {
  const { t } = useAdminLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("slug,name,image_url,category,is_active")
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) {
        toast.error(error.message);
      } else {
        setRows((data ?? []) as Row[]);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => !!r.image_url)
      .filter((r) => {
        if (filter === "active") return r.is_active;
        if (filter === "inactive") return !r.is_active;
        return true;
      })
      .filter((r) => {
        if (!term) return true;
        return (
          r.name?.toLowerCase().includes(term) ||
          r.slug?.toLowerCase().includes(term) ||
          (r.category ?? "").toLowerCase().includes(term) ||
          (r.image_url ?? "").toLowerCase().includes(term)
        );
      });
  }, [rows, q, filter]);

  async function handleDownload(row: Row) {
    if (!row.image_url) return;
    const fname = `${row.slug || "product"}.${extFromUrl(row.image_url)}`;
    try {
      await downloadOne(row.image_url, fname);
    } catch (e) {
      // Fallback: open in new tab
      window.open(row.image_url, "_blank", "noopener");
      toast.message(t("Opened in new tab", "নতুন ট্যাবে খোলা হয়েছে"), {
        description: t("Right-click → Save image as…", "ডান-ক্লিক → Save image as…"),
      });
    }
  }

  async function handleDownloadAll() {
    if (downloadingAll || filtered.length === 0) return;
    setDownloadingAll(true);
    toast.message(t("Starting downloads…", "ডাউনলোড শুরু হচ্ছে…"), {
      description: `${filtered.length} ${t("files", "ফাইল")}`,
    });
    let ok = 0, fail = 0;
    for (const row of filtered) {
      try {
        await handleDownload(row);
        ok++;
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        fail++;
      }
    }
    setDownloadingAll(false);
    toast.success(`${t("Done", "সম্পন্ন")}: ${ok}/${filtered.length}${fail ? ` · ${fail} ${t("failed", "ব্যর্থ")}` : ""}`);
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  const total = rows.filter((r) => !!r.image_url).length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{filtered.length}</span> / {total} {t("product images", "প্রোডাক্ট ইমেজ")}
        </div>
        <button
          onClick={handleDownloadAll}
          disabled={downloadingAll || filtered.length === 0}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {downloadingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
          {t("Download all", "সব ডাউনলোড")}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search name, slug, category…", "নাম, slug, ক্যাটাগরি খুঁজুন…")}
            className="w-full h-11 pl-11 pr-4 rounded-full border border-slate-200 bg-white outline-none text-sm focus:border-indigo-400"
          />
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-slate-200">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 px-4 rounded-full text-xs font-semibold transition ${
                filter === f ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t(
                f === "all" ? "All" : f === "active" ? "Active" : "Inactive",
                f === "all" ? "সব" : f === "active" ? "একটিভ" : "ইনঅ্যাকটিভ",
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t("No images found.", "কোন ইমেজ পাওয়া যায়নি।")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((row) => (
            <div
              key={row.slug}
              className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition"
            >
              <div className="aspect-square bg-slate-50 relative overflow-hidden">
                <img
                  src={row.image_url!}
                  alt={row.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                {!row.is_active && (
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-white">
                    {t("Inactive", "ইনঅ্যাকটিভ")}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-3">
                  <button
                    onClick={() => handleDownload(row)}
                    title={t("Download", "ডাউনলোড")}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-indigo-600 shadow hover:scale-110 transition"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopy(row.image_url!)}
                    title={t("Copy URL", "URL কপি")}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-slate-700 shadow hover:scale-110 transition"
                  >
                    {copied === row.image_url ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={row.image_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("Open", "খুলুন")}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-slate-700 shadow hover:scale-110 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div className="p-3">
                <div className="text-[13px] font-semibold text-slate-900 truncate" title={row.name}>{row.name}</div>
                <div className="text-[11px] text-slate-500 truncate" title={row.slug}>{row.slug}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
