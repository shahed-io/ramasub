import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, Search, RefreshCw, ExternalLink, CheckCircle2, XCircle, Globe,
  BarChart3, FileText, Link as LinkIcon, Send, Trash2, PlugZap, Settings2,
  Save, X, Plus, ShieldCheck, Copy,
} from "lucide-react";
import {
  listSites, searchAnalytics, listSitemaps, submitSitemap, deleteSitemap,
  inspectUrl, gscHealthCheck,
  startMetaVerification, completeMetaVerification, listVerifiedResources, getVerificationStatus,
} from "@/lib/search-console.functions";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/Mahbub214/search-console")({
  component: SearchConsolePage,
  head: () => ({ meta: [{ title: "Search Console — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type Site = { siteUrl: string; permissionLevel: string };
type Sitemap = { path: string; lastSubmitted?: string; isPending?: boolean; errors?: string; warnings?: string };
type SARow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };
type FilterOp = "equals" | "notEquals" | "contains" | "notContains";
type Filter = { dimension: string; operator: FilterOp; expression: string };

type Prefs = {
  siteUrl?: string;
  rangeDays: number;                // 7 | 28 | 90 | -1 (custom)
  customStart?: string;
  customEnd?: string;
  rowLimit: number;
  searchType: "web" | "image" | "video" | "news" | "discover";
  filters: Filter[];
  sitemapPaths: string[];           // saved custom sitemap paths
};

const PREFS_KEY = "gsc:prefs:v1";
const DEFAULT_PREFS: Prefs = {
  rangeDays: 28,
  rowLimit: 25,
  searchType: "web",
  filters: [],
  sitemapPaths: [`${SITE_URL}/sitemap.xml`],
};

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}
function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") }; }
  catch { return DEFAULT_PREFS; }
}

function SearchConsolePage() {
  const health = useServerFn(gscHealthCheck);
  const fnListSites = useServerFn(listSites);
  const fnSA = useServerFn(searchAnalytics);
  const fnListSm = useServerFn(listSitemaps);
  const fnSubmitSm = useServerFn(submitSitemap);
  const fnDeleteSm = useServerFn(deleteSitemap);
  const fnInspect = useServerFn(inspectUrl);

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [tab, setTab] = useState<"overview" | "queries" | "pages" | "sitemaps" | "inspect" | "settings">("overview");

  const [overview, setOverview] = useState<SARow[]>([]);
  const [queries, setQueries] = useState<SARow[]>([]);
  const [pages, setPages] = useState<SARow[]>([]);
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [busy, setBusy] = useState(false);

  const [inspectInput, setInspectInput] = useState(SITE_URL + "/");
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [newSmPath, setNewSmPath] = useState("");

  // Compute active date range from prefs
  const range = useMemo(() => {
    if (prefs.rangeDays === -1 && prefs.customStart && prefs.customEnd) {
      return { start: prefs.customStart, end: prefs.customEnd };
    }
    return { start: daysAgo(prefs.rangeDays), end: daysAgo(1) };
  }, [prefs.rangeDays, prefs.customStart, prefs.customEnd]);

  useEffect(() => { setPrefs(loadPrefs()); }, []);

  useEffect(() => {
    (async () => {
      try {
        const h = await health();
        setConnected(h.connected);
        if (h.connected) {
          const { sites } = await fnListSites();
          setSites(sites);
          const saved = prefs.siteUrl && sites.find((s) => s.siteUrl === prefs.siteUrl);
          const preferred = saved
            ?? sites.find((s) => s.siteUrl.replace(/\/$/, "") === SITE_URL.replace(/\/$/, ""))
            ?? sites.find((s) => s.siteUrl.startsWith("sc-domain:ramasub"))
            ?? sites[0];
          if (preferred) setSiteUrl(preferred.siteUrl);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!siteUrl) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteUrl, prefs.rangeDays, prefs.customStart, prefs.customEnd, prefs.rowLimit, prefs.searchType, JSON.stringify(prefs.filters)]);

  function savePrefs(next: Prefs) {
    setPrefs(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
  }

  async function loadAll() {
    setBusy(true);
    try {
      const shared = { siteUrl, startDate: range.start, endDate: range.end, searchType: prefs.searchType, filters: prefs.filters };
      const [ov, q, p, sm] = await Promise.all([
        fnSA({ data: { ...shared, dimensions: ["date"], rowLimit: 1000 } }),
        fnSA({ data: { ...shared, dimensions: ["query"], rowLimit: prefs.rowLimit } }),
        fnSA({ data: { ...shared, dimensions: ["page"], rowLimit: prefs.rowLimit } }),
        fnListSm({ data: { siteUrl } }),
      ]);
      setOverview(ov.rows as SARow[]);
      setQueries(q.rows as SARow[]);
      setPages(p.rows as SARow[]);
      setSitemaps(sm.sitemaps as Sitemap[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Query failed");
    } finally {
      setBusy(false);
    }
  }

  const totals = useMemo(() => overview.reduce(
    (a, r) => ({ clicks: a.clicks + (r.clicks ?? 0), impressions: a.impressions + (r.impressions ?? 0) }),
    { clicks: 0, impressions: 0 },
  ), [overview]);
  const avgCtr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgPos = overview.length ? overview.reduce((a, r) => a + (r.position ?? 0), 0) / overview.length : 0;

  async function submitPath(feedpath: string) {
    if (!siteUrl || !feedpath) return;
    try {
      setBusy(true);
      await fnSubmitSm({ data: { siteUrl, feedpath } });
      toast.success("Sitemap submitted");
      const sm = await fnListSm({ data: { siteUrl } });
      setSitemaps(sm.sitemaps as Sitemap[]);
      if (!prefs.sitemapPaths.includes(feedpath)) {
        savePrefs({ ...prefs, sitemapPaths: [...prefs.sitemapPaths, feedpath] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally { setBusy(false); }
  }

  async function removeSitemap(feedpath: string) {
    if (!confirm(`Delete sitemap ${feedpath}?`)) return;
    try {
      setBusy(true);
      await fnDeleteSm({ data: { siteUrl, feedpath } });
      const sm = await fnListSm({ data: { siteUrl } });
      setSitemaps(sm.sitemaps as Sitemap[]);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally { setBusy(false); }
  }

  async function runInspect() {
    try {
      setBusy(true); setInspectResult(null);
      const r = await fnInspect({ data: { siteUrl, inspectionUrl: inspectInput } });
      setInspectResult(r.inspectionResult ?? r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inspect failed");
    } finally { setBusy(false); }
  }

  if (loading) {
    return <div className="min-h-[40vh] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-6 md:p-8 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <Search className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold">Google Search Console</h1>
              <p className="text-white/80 text-sm mt-1">Analytics, sitemap, URL inspection — সব customizable admin থেকে</p>
            </div>
            <div className={`hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${connected ? "bg-emerald-400/20 text-emerald-50" : "bg-rose-400/20 text-rose-50"}`}>
              {connected ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {connected ? "Connected" : "Not connected"}
            </div>
          </div>
        </div>

        {!connected && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
            <PlugZap className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Search Console connector connect করা নেই</p>
              <p className="mt-1">Connectors → Google Search Console থেকে account link করে page reload দিন।</p>
            </div>
          </div>
        )}

        {connected && (
          <>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Site</label>
                <select
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={siteUrl}
                  onChange={(e) => { setSiteUrl(e.target.value); savePrefs({ ...prefs, siteUrl: e.target.value }); }}
                >
                  {sites.length === 0 && <option>No verified sites</option>}
                  {sites.map((s) => <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl} — {s.permissionLevel}</option>)}
                </select>
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={prefs.rangeDays}
                  onChange={(e) => savePrefs({ ...prefs, rangeDays: Number(e.target.value) })}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={28}>Last 28 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={180}>Last 6 months</option>
                  <option value={-1}>Custom range</option>
                </select>
                <button
                  onClick={loadAll}
                  disabled={busy || !siteUrl}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
                </button>
              </div>

              {prefs.rangeDays === -1 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={prefs.customStart ?? daysAgo(28)} onChange={(e) => savePrefs({ ...prefs, customStart: e.target.value })} />
                  <input type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={prefs.customEnd ?? daysAgo(1)} onChange={(e) => savePrefs({ ...prefs, customEnd: e.target.value })} />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {[
                  { k: "overview", label: "Overview", icon: BarChart3 },
                  { k: "queries", label: "Top Queries", icon: Search },
                  { k: "pages", label: "Top Pages", icon: FileText },
                  { k: "sitemaps", label: "Sitemaps", icon: LinkIcon },
                  { k: "inspect", label: "URL Inspection", icon: ExternalLink },
                  { k: "settings", label: "Settings", icon: Settings2 },
                ].map((t) => {
                  const Icon = t.icon; const active = tab === t.k;
                  return (
                    <button key={t.k} onClick={() => setTab(t.k as any)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        active ? "bg-cyan-600 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}>
                      <Icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {tab === "overview" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat title="Clicks" value={totals.clicks.toLocaleString()} tone="from-cyan-500 to-sky-600" />
                <Stat title="Impressions" value={totals.impressions.toLocaleString()} tone="from-violet-500 to-indigo-600" />
                <Stat title="Avg CTR" value={`${avgCtr.toFixed(2)}%`} tone="from-emerald-500 to-teal-600" />
                <Stat title="Avg Position" value={avgPos.toFixed(1)} tone="from-amber-500 to-orange-600" />
                <div className="col-span-2 md:col-span-4 rounded-2xl bg-white border border-slate-200 p-4 text-xs text-slate-500">
                  Range: {range.start} → {range.end} · Type: {prefs.searchType} · Filters: {prefs.filters.length}
                </div>
              </div>
            )}

            {tab === "queries" && <SATable rows={queries} col="Query" />}
            {tab === "pages" && <SATable rows={pages} col="Page" isPage />}

            {tab === "sitemaps" && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900">Submitted sitemaps</h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono"
                    placeholder={`${SITE_URL}/sitemap.xml`}
                    value={newSmPath}
                    onChange={(e) => setNewSmPath(e.target.value)}
                  />
                  <button
                    onClick={() => { const p = newSmPath.trim() || `${SITE_URL}/sitemap.xml`; submitPath(p); setNewSmPath(""); }}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold shadow disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> Submit
                  </button>
                </div>
                {prefs.sitemapPaths.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {prefs.sitemapPaths.map((p) => (
                      <button key={p} onClick={() => submitPath(p)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1 font-mono">
                        <Send className="w-3 h-3" /> {p}
                      </button>
                    ))}
                  </div>
                )}
                {sitemaps.length === 0 ? (
                  <p className="text-sm text-slate-500">এখনো কোনো sitemap submit করা হয়নি।</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-slate-500 border-b">
                        <tr><th className="text-left py-2 px-2">Path</th><th className="text-left py-2 px-2">Last Submitted</th><th className="text-left py-2 px-2">Errors</th><th className="text-left py-2 px-2">Warnings</th><th></th></tr>
                      </thead>
                      <tbody>
                        {sitemaps.map((s) => (
                          <tr key={s.path} className="border-b">
                            <td className="py-2 px-2 font-mono text-xs">{s.path}</td>
                            <td className="py-2 px-2">{s.lastSubmitted ? new Date(s.lastSubmitted).toLocaleString() : "—"}</td>
                            <td className="py-2 px-2">{s.errors ?? 0}</td>
                            <td className="py-2 px-2">{s.warnings ?? 0}</td>
                            <td className="py-2 px-2 text-right">
                              <button onClick={() => removeSitemap(s.path)} className="text-rose-600 hover:text-rose-700 inline-flex items-center gap-1">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === "inspect" && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-4">
                <h2 className="text-base font-bold text-slate-900">URL Inspection</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={inspectInput} onChange={(e) => setInspectInput(e.target.value)} placeholder="https://ramasub.com/page" />
                  <button onClick={runInspect} disabled={busy || !inspectInput}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Inspect
                  </button>
                </div>
                {inspectResult && (
                  <pre className="rounded-xl bg-slate-900 text-slate-100 text-xs p-4 overflow-auto max-h-[500px]">
                    {JSON.stringify(inspectResult, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {tab === "settings" && (
              <SettingsPanel prefs={prefs} save={savePrefs} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value, tone }: { title: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow bg-gradient-to-br ${tone}`}>
      <div className="text-xs opacity-80">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function SATable({ rows, col, isPage }: { rows: SARow[]; col: string; isPage?: boolean }) {
  if (!rows.length) return <div className="rounded-2xl bg-white border border-slate-200 p-6 text-sm text-slate-500">এই range এ কোনো data নেই।</div>;
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 border-b bg-slate-50">
            <tr>
              <th className="text-left py-2.5 px-3">{col}</th>
              <th className="text-right py-2.5 px-3">Clicks</th>
              <th className="text-right py-2.5 px-3">Impr.</th>
              <th className="text-right py-2.5 px-3">CTR</th>
              <th className="text-right py-2.5 px-3">Pos.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const key = r.keys?.[0] ?? "—";
              return (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="py-2 px-3 max-w-md truncate">
                    {isPage ? (
                      <a href={key} target="_blank" rel="noreferrer" className="text-cyan-700 hover:underline inline-flex items-center gap-1">
                        {key.replace(/^https?:\/\/[^/]+/, "")} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : key}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold">{r.clicks}</td>
                  <td className="py-2 px-3 text-right">{r.impressions}</td>
                  <td className="py-2 px-3 text-right">{((r.ctr ?? 0) * 100).toFixed(2)}%</td>
                  <td className="py-2 px-3 text-right">{(r.position ?? 0).toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPanel({ prefs, save }: { prefs: Prefs; save: (p: Prefs) => void }) {
  const [local, setLocal] = useState<Prefs>(prefs);
  useEffect(() => setLocal(prefs), [prefs]);

  function addFilter() {
    setLocal({ ...local, filters: [...local.filters, { dimension: "country", operator: "equals", expression: "bgd" }] });
  }
  function removeFilter(i: number) {
    setLocal({ ...local, filters: local.filters.filter((_, idx) => idx !== i) });
  }
  function updateFilter(i: number, patch: Partial<Filter>) {
    setLocal({ ...local, filters: local.filters.map((f, idx) => idx === i ? { ...f, ...patch } : f) });
  }
  function addSitemap() {
    setLocal({ ...local, sitemapPaths: [...local.sitemapPaths, `${SITE_URL}/sitemap.xml`] });
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Customize</h2>
          <p className="text-xs text-slate-500 mt-1">Preferences browser এ locally save হবে।</p>
        </div>
        <button onClick={() => save(local)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-emerald-600 text-white text-sm font-semibold shadow">
          <Save className="w-4 h-4" /> Save
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Row limit (top queries/pages)">
          <input type="number" min={1} max={1000} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={local.rowLimit} onChange={(e) => setLocal({ ...local, rowLimit: Math.max(1, Math.min(1000, Number(e.target.value) || 25)) })} />
        </Field>
        <Field label="Search type">
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={local.searchType} onChange={(e) => setLocal({ ...local, searchType: e.target.value as Prefs["searchType"] })}>
            <option value="web">Web</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="news">News</option>
            <option value="discover">Discover</option>
          </select>
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Filters</h3>
          <button onClick={addFilter} className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:text-cyan-900 font-semibold">
            <Plus className="w-3.5 h-3.5" /> Add filter
          </button>
        </div>
        {local.filters.length === 0 && <p className="text-xs text-slate-500">কোনো filter নেই — সব data দেখানো হবে।</p>}
        {local.filters.map((f, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <select className="col-span-3 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              value={f.dimension} onChange={(e) => updateFilter(i, { dimension: e.target.value })}>
              <option value="country">Country</option>
              <option value="device">Device</option>
              <option value="page">Page</option>
              <option value="query">Query</option>
              <option value="searchAppearance">Search appearance</option>
            </select>
            <select className="col-span-3 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              value={f.operator} onChange={(e) => updateFilter(i, { operator: e.target.value as FilterOp })}>
              <option value="equals">equals</option>
              <option value="notEquals">not equals</option>
              <option value="contains">contains</option>
              <option value="notContains">not contains</option>
            </select>
            <input className="col-span-5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              placeholder={f.dimension === "country" ? "bgd / usa / ind" : f.dimension === "device" ? "MOBILE / DESKTOP / TABLET" : "value"}
              value={f.expression} onChange={(e) => updateFilter(i, { expression: e.target.value })} />
            <button onClick={() => removeFilter(i)} className="col-span-1 text-rose-500 hover:text-rose-700"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Sitemap quick-submit list</h3>
          <button onClick={addSitemap} className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:text-cyan-900 font-semibold">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {local.sitemapPaths.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono"
              value={p} onChange={(e) => setLocal({ ...local, sitemapPaths: local.sitemapPaths.map((x, idx) => idx === i ? e.target.value : x) })} />
            <button onClick={() => setLocal({ ...local, sitemapPaths: local.sitemapPaths.filter((_, idx) => idx !== i) })}
              className="text-rose-500 hover:text-rose-700"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600 block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
