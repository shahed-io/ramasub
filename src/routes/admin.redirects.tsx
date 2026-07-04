import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, ArrowRight, Power, Repeat, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { listRedirects, upsertRedirect, deleteRedirect, type Redirect } from "@/lib/redirects.functions";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/redirects")({
  component: RedirectsPage,
  head: () => ({ meta: [{ title: "Redirects — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function RedirectsPage() {
  const { t } = useAdminLang();
  const list = useServerFn(listRedirects);
  const save = useServerFn(upsertRedirect);
  const del = useServerFn(deleteRedirect);

  const [rows, setRows] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Redirect> | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      setRows(await list());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onSave = async () => {
    if (!editing?.from_path || !editing?.to_path) {
      toast.error(t("Both URLs required", "দুটি URL দরকার"));
      return;
    }
    try {
      await save({
        data: {
          id: editing.id,
          from_path: editing.from_path,
          to_path: editing.to_path,
          status_code: editing.status_code ?? 301,
          is_active: editing.is_active ?? true,
          notes: editing.notes ?? undefined,
        },
      });
      toast.success(t("Saved", "সংরক্ষিত"));
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm(t("Delete this redirect?", "এই রিডিরেক্টটি মুছবেন?"))) return;
    try {
      await del({ data: { id } });
      toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const onToggle = async (r: Redirect) => {
    try {
      await save({
        data: { id: r.id, from_path: r.from_path, to_path: r.to_path, status_code: r.status_code, is_active: !r.is_active, notes: r.notes ?? undefined },
      });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-500 via-orange-500 to-rose-600 p-6 md:p-8 text-white shadow-xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
              <Repeat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t("Redirect Manager", "রিডিরেক্ট ম্যানেজার")}</h1>
              <p className="text-white/85 text-sm mt-1">{t("301/302 redirects — keep link juice when URLs change", "URL পরিবর্তন হলে SEO ranking ধরে রাখুন")}</p>
            </div>
          </div>
          <button
            onClick={() => setEditing({ status_code: 301, is_active: true })}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-orange-600 px-4 py-2.5 text-sm font-bold shadow hover:shadow-lg"
          >
            <Plus className="w-4 h-4" /> {t("New redirect", "নতুন রিডিরেক্ট")}
          </button>
        </div>

        {/* List */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <Repeat className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">{t("No redirects yet", "এখনো কোন রিডিরেক্ট নেই")}</p>
              <p className="text-xs text-slate-500 mt-1">{t("Add one when you rename a page or product slug.", "কোন পেজ বা প্রোডাক্ট slug পরিবর্তন করলে যোগ করুন।")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="p-4 flex items-center gap-3 hover:bg-slate-50/60">
                  <button
                    onClick={() => onToggle(r)}
                    title={r.is_active ? "Active" : "Inactive"}
                    className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${r.is_active ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"}`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <code className="font-mono font-semibold text-slate-900 truncate">{r.from_path}</code>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <code className="font-mono text-indigo-600 truncate">{r.to_path}</code>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.status_code === 301 ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>{r.status_code}</span>
                    </div>
                    {r.notes && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{r.notes}</div>}
                    <div className="text-[10px] text-slate-400 mt-0.5">{r.hits} {t("hits", "হিট")}</div>
                  </div>
                  <button onClick={() => setEditing(r)} className="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-slate-500 hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(r.id)} className="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-slate-500 px-2">
          {t("Tip: redirects refresh on the live site within ~60 seconds.", "টিপ: লাইভ সাইটে ~৬০ সেকেন্ডের মধ্যে রিডিরেক্ট আপডেট হয়।")}
        </p>
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing.id ? t("Edit redirect", "রিডিরেক্ট এডিট") : t("New redirect", "নতুন রিডিরেক্ট")}</h2>
              <button onClick={() => setEditing(null)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <Field label={t("From (old path)", "From (পুরনো path)")}>
              <input className={inp} value={editing.from_path ?? ""} onChange={(e) => setEditing((p) => ({ ...p, from_path: e.target.value }))} placeholder="/old-page" />
            </Field>
            <Field label={t("To (new URL)", "To (নতুন URL)")}>
              <input className={inp} value={editing.to_path ?? ""} onChange={(e) => setEditing((p) => ({ ...p, to_path: e.target.value }))} placeholder="/new-page or https://…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Status code", "স্ট্যাটাস কোড")}>
                <select className={inp} value={editing.status_code ?? 301} onChange={(e) => setEditing((p) => ({ ...p, status_code: Number(e.target.value) }))}>
                  <option value={301}>301 — Permanent (best for SEO)</option>
                  <option value={302}>302 — Temporary</option>
                  <option value={307}>307 — Temp (preserve method)</option>
                  <option value={308}>308 — Permanent (preserve method)</option>
                </select>
              </Field>
              <Field label={t("Active", "সক্রিয়")}>
                <label className="flex items-center gap-2 h-[42px] px-3 rounded-xl border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing((p) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">{editing.is_active ?? true ? t("Enabled", "চালু") : t("Disabled", "বন্ধ")}</span>
                </label>
              </Field>
            </div>
            <Field label={t("Notes (optional)", "নোট (ঐচ্ছিক)")}>
              <input className={inp} value={editing.notes ?? ""} onChange={(e) => setEditing((p) => ({ ...p, notes: e.target.value }))} placeholder="Why?" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">{t("Cancel", "বাতিল")}</button>
              <button onClick={onSave} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white text-sm font-bold shadow hover:shadow-lg">
                <Save className="w-4 h-4" /> {t("Save", "সেভ")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700 block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
