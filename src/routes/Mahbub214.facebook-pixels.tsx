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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Facebook className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Facebook Pixels</h1>
                <p className="text-white/85 text-sm mt-1">
                  একসঙ্গে একাধিক Meta Pixel যোগ করুন — সব enabled pixel-এ automatically PageView ও events fire হবে।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-indigo-700 px-4 py-2.5 text-sm font-semibold shadow hover:bg-white/95 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2.75} />
              Add Pixel
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3 text-sm text-blue-900">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">কীভাবে কাজ করে</p>
            <p className="text-blue-800/90">
              প্রতিটি enabled pixel-এ front-end থেকে <code className="px-1 py-0.5 bg-blue-100 rounded">fbq('init', PIXEL_ID)</code> এবং প্রতি route change-এ PageView পাঠানো হয়। Access Token শুধু CAPI (server-side) কাজের জন্য — চাইলে খালি রাখতে পারেন।
            </p>
          </div>
        </div>

        {/* List */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
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
                <li key={p.id} className="p-4 sm:p-5 flex items-center gap-4 flex-wrap">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${p.enabled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                    <Facebook className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 truncate">
                        {p.label || "Untitled Pixel"}
                      </span>
                      {p.enabled ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">ACTIVE</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">DISABLED</span>
                      )}
                      {p.access_token && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">CAPI</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5 font-mono">
                      {p.pixel_id}
                    </div>
                    {p.notes && <div className="text-xs text-slate-400 mt-1">{p.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(p)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                        p.enabled
                          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "border-violet-200 bg-white text-violet-700 hover:bg-violet-100"
                      }`}
                    >
                      {p.enabled ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      {p.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
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
