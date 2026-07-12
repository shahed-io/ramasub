import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAllPages, type SitePage, type PageStatus } from "@/lib/pages";
import { FileEdit, Search, ExternalLink, Circle } from "lucide-react";

export const Route = createFileRoute("/Mahbub214/pages")({
  component: AdminPagesList,
});

const STATUS_STYLE: Record<PageStatus, string> = {
  published: "bg-violet-100 text-violet-700 ring-violet-200",
  draft: "bg-violet-100 text-violet-700 ring-violet-200",
  hidden: "bg-slate-200 text-slate-700 ring-slate-300",
};

function StatusPill({ s }: { s: PageStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${STATUS_STYLE[s]}`}>
      <Circle className="w-2 h-2 fill-current" />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function AdminPagesList() {
  const { data, isLoading } = useAllPages();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | PageStatus>("all");

  const rows = useMemo(() => {
    const list = data ?? [];
    const query = q.trim().toLowerCase();
    return list.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!query) return true;
      return p.title.toLowerCase().includes(query) || p.path.toLowerCase().includes(query) || p.key.toLowerCase().includes(query);
    });
  }, [data, q, status]);

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      all: list.length,
      published: list.filter((p) => p.status === "published").length,
      draft: list.filter((p) => p.status === "draft").length,
      hidden: list.filter((p) => p.status === "hidden").length,
    };
  }, [data]);

  return (
    <div className="max-w-[1200px] mx-auto min-w-0">
      <AdminPageHeader />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {(["all", "published", "draft", "hidden"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setStatus(k as any)}
            className={`text-left rounded-2xl border p-4 transition ${status === k ? "border-violet-400 ring-2 ring-violet-200 bg-white" : "border-slate-200 bg-white hover:border-violet-300"}`}
          >
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k}</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">{counts[k]}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages by name or path…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1fr_130px_140px_100px] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div>Title</div>
          <div>Path</div>
          <div>Status</div>
          <div>Updated</div>
          <div className="text-right">Action</div>
        </div>

        {isLoading && <div className="p-8 text-center text-sm text-slate-500">Loading pages…</div>}
        {!isLoading && rows.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No pages match your filters.</div>}

        {rows.map((p: SitePage) => (
          <div key={p.id} className="grid md:grid-cols-[1fr_1fr_130px_140px_100px] gap-3 items-center px-5 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">{p.title}</div>
              <div className="md:hidden text-xs text-slate-500 mt-0.5 truncate">{p.path}</div>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-sm text-slate-600 truncate">
              <code className="text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200">{p.path}</code>
              <a href={p.path} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-violet-600" title="Open page">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div><StatusPill s={p.status} /></div>
            <div className="hidden md:block text-xs text-slate-500">{new Date(p.updated_at).toLocaleDateString()}</div>
            <div className="md:text-right">
              <Link
                to="/Mahbub214/pages/$key"
                params={{ key: p.key }}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold shadow-sm hover:shadow-md"
              >
                <FileEdit className="w-3.5 h-3.5" />
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
