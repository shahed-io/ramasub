import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Pencil, Save, X, Facebook, Power, PowerOff, Info,
} from "lucide-react";
import {
  listFacebookPixels,
  upsertFacebookPixel,
  toggleFacebookPixel,
  deleteFacebookPixel,
  type FacebookPixel,
} from "@/lib/facebook-pixels.functions";

export const Route = createFileRoute("/Mahbub214/facebook-pixels")({
  component: FacebookPixelsPage,
  head: () => ({
    meta: [{ title: "Facebook Pixels — Admin" }],
  }),
});

type Draft = {
  id?: string;
  label: string;
  pixel_id: string;
  access_token: string;
  enabled: boolean;
  sort_order: number;
  notes: string;
};

const emptyDraft: Draft = {
  label: "",
  pixel_id: "",
  access_token: "",
  enabled: true,
  sort_order: 0,
  notes: "",
};

function FacebookPixelsPage() {
  const list = useServerFn(listFacebookPixels);
  const upsert = useServerFn(upsertFacebookPixel);
  const toggle = useServerFn(toggleFacebookPixel);
  const remove = useServerFn(deleteFacebookPixel);

  const [items, setItems] = useState<FacebookPixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await list();
      setItems(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load pixels");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setDraft({ ...emptyDraft, sort_order: items.length });
  }

  function startEdit(p: FacebookPixel) {
    setDraft({
      id: p.id,
      label: p.label ?? "",
      pixel_id: p.pixel_id ?? "",
      access_token: "",
      enabled: p.enabled,
      sort_order: p.sort_order,
      notes: p.notes ?? "",
    });
  }

  async function handleSave() {
    if (!draft) return;
    if (!/^\d{6,25}$/.test(draft.pixel_id.trim())) {
      toast.error("Pixel ID must be numeric (6–25 digits)");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        data: {
          id: draft.id,
          label: draft.label,
          pixel_id: draft.pixel_id,
          access_token: draft.access_token || undefined,
          enabled: draft.enabled,
          sort_order: draft.sort_order,
          notes: draft.notes,
        },
      });
      toast.success(draft.id ? "Pixel updated" : "Pixel added");
      setDraft(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(p: FacebookPixel) {
    try {
      await toggle({ data: { id: p.id, enabled: !p.enabled } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toggle failed");
    }
  }

  async function handleDelete(p: FacebookPixel) {
    if (!confirm(`Delete pixel "${p.label || p.pixel_id}"?`)) return;
    try {
      await remove({ data: { id: p.id } });
      toast.success("Pixel deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const activeCount = items.filter((p) => p.enabled).length;
  const capiCount = items.filter((p) => p.access_token).length;

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Stats + action */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="a-stat p-4">
            <div className="flex items-center justify-between">
              <span className="a-stat-label">মোট Pixel</span>
              <span className="a-stat-icon bg-violet-100 text-violet-600"><Facebook className="w-4 h-4" /></span>
            </div>
            <div className="a-stat-value mt-1">{items.length}</div>
          </div>
          <div className="a-stat p-4">
            <div className="flex items-center justify-between">
              <span className="a-stat-label">Active</span>
              <span className="a-stat-icon bg-emerald-100 text-emerald-600"><Power className="w-4 h-4" /></span>
            </div>
            <div className="a-stat-value mt-1">{activeCount}</div>
          </div>
          <div className="a-stat p-4">
            <div className="flex items-center justify-between">
              <span className="a-stat-label">CAPI Ready</span>
              <span className="a-stat-icon bg-sky-100 text-sky-600"><Save className="w-4 h-4" /></span>
            </div>
            <div className="a-stat-value mt-1">{capiCount}</div>
          </div>
          <button
            type="button"
            onClick={startNew}
            className="a-card p-4 flex flex-col items-start justify-center gap-1.5 text-left hover:shadow-md transition-shadow"
          >
            <span className="a-save-btn pointer-events-none">
              <Plus className="w-4 h-4" strokeWidth={2.75} />
              Add Pixel
            </span>
            <span className="text-xs text-slate-500">নতুন Meta Pixel যোগ করুন</span>
          </button>
        </div>

        {/* Info */}
        <div className="a-card p-4 flex items-start gap-3 text-sm">
          <span className="a-action a-action-violet flex-shrink-0"><Info className="w-4 h-4" /></span>
          <div className="text-slate-600">
            <p className="font-bold text-slate-900 mb-0.5">কীভাবে কাজ করে</p>
            <p>
              প্রতিটি enabled pixel-এ front-end থেকে <code className="px-1 py-0.5 bg-violet-50 text-violet-700 rounded font-mono text-[12px]">fbq('init', PIXEL_ID)</code> এবং প্রতি route change-এ PageView পাঠানো হয়। Access Token শুধু CAPI (server-side) কাজের জন্য — চাইলে খালি রাখতে পারেন।
            </p>
          </div>
        </div>

        {/* List */}
        <div className="a-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading pixels…
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Facebook className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">কোনো pixel যোগ করা হয়নি</p>
              <p className="text-sm mt-1">উপরের <b>Add Pixel</b> বাটনে ক্লিক করে শুরু করুন।</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((p) => (
                <li key={p.id} className="p-4 flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 rounded-full grid place-items-center flex-shrink-0 ${p.enabled ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-400"}`}>
                    <Facebook className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 truncate">
                        {p.label || "Untitled Pixel"}
                      </span>
                      <span className={`a-status ${p.enabled ? "a-status-completed" : "a-status-closed"}`}>
                        {p.enabled ? "ACTIVE" : "DISABLED"}
                      </span>
                      {p.access_token && <span className="a-status a-status-refunded">CAPI</span>}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5 font-mono truncate">{p.pixel_id}</div>
                    {p.notes && <div className="text-xs text-slate-400 mt-0.5 truncate">{p.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      title={p.enabled ? "Disable" : "Enable"}
                      aria-label={p.enabled ? "Disable pixel" : "Enable pixel"}
                      onClick={() => handleToggle(p)}
                      className={`a-action ${p.enabled ? "a-action-amber" : "a-action-emerald"}`}
                    >
                      {p.enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      title="Edit"
                      aria-label="Edit pixel"
                      onClick={() => startEdit(p)}
                      className="a-action a-action-sky"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete pixel"
                      onClick={() => handleDelete(p)}
                      className="a-action a-action-rose"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>


      {/* Drawer / Modal */}
      {draft && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !saving && setDraft(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {draft.id ? "Edit Facebook Pixel" : "Add Facebook Pixel"}
              </h2>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="text-slate-400 hover:text-slate-700"
                disabled={saving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Label (optional)</label>
                <input
                  type="text"
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder="e.g. Main Store Pixel"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Pixel ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={draft.pixel_id}
                  onChange={(e) => setDraft({ ...draft, pixel_id: e.target.value.replace(/\D/g, "") })}
                  placeholder="1234567890123456"
                  inputMode="numeric"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Meta Events Manager থেকে 15–16 digit Pixel ID</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Access Token (optional — CAPI)
                </label>
                <input
                  type="password"
                  value={draft.access_token}
                  onChange={(e) => setDraft({ ...draft, access_token: e.target.value })}
                  placeholder={draft.id ? "(unchanged — leave blank to keep)" : "EAAG..."}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Notes (internal)</label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  rows={2}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">Active</div>
                  <div className="text-xs text-slate-500">Enabled pixels fire on every public page.</div>
                </div>
              </label>
            </div>
            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !draft.pixel_id}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {draft.id ? "Save Changes" : "Add Pixel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
