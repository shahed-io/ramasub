import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Gift, Users, Trophy, Calendar, ExternalLink, Trash2, Pencil, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminStatCard, AdminStatGrid, AdminGlassCard } from "@/components/admin/AdminStatCard";

export const Route = createFileRoute("/Mahbub214/offers")({
  component: AdminOffersList,
});

type Campaign = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "active" | "ended";
  cover_image: string | null;
  starts_at: string | null;
  ends_at: string | null;
  winner_count: number;
  total_submissions: number;
  show_winners_publicly: boolean;
  created_at: string;
};

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function AdminOffersList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("offer_campaigns" as never)
      .select("id,slug,title,status,cover_image,starts_at,ends_at,winner_count,total_submissions,show_winners_publicly,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems(((data ?? []) as unknown) as Campaign[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createNew = async () => {
    if (!newTitle.trim()) return toast.error("Title required");
    const slug = slugify(newTitle) + "-" + Math.random().toString(36).slice(2, 6);
    const payload: any = {
      title: newTitle.trim(),
      slug,
      status: "draft",
      winner_count: 1,
      prizes: [{ rank: 1, title: "1st Prize", description: "" }],
      fields_schema: [
        { id: "fld_name", type: "text", label: "Your Name", required: true },
        { id: "fld_email", type: "email", label: "Email", required: true },
        { id: "fld_phone", type: "phone", label: "WhatsApp / Phone", required: true },
      ],
    };
    const { data, error } = await supabase
      .from("offer_campaigns" as never)
      .insert(payload)
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    setCreating(false);
    setNewTitle("");
    navigate({ to: "/Mahbub214/offers/$id", params: { id: (data as any).id } });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this campaign and all its submissions?")) return;
    const { error } = await supabase.from("offer_campaigns" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/offer/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied: " + url);
  };

  const activeCount = items.filter((c) => c.status === "active").length;
  const totalSubs = items.reduce((s, c) => s + (c.total_submissions || 0), 0);
  const endedCount = items.filter((c) => c.status === "ended").length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Offers &amp; Giveaways</h1>
          <p className="text-sm text-slate-500 mt-1">নিজের domain এ form, automatic winner pick — সম্পূর্ণ control।</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 h-10 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 ring-1 ring-pink-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-[0_8px_22px_-8px_rgba(219,39,119,0.7)] hover:opacity-95"
        >
          <Plus className="w-4 h-4" /> New campaign
        </button>
      </div>

      <AdminStatGrid>
        <AdminStatCard label="Total Campaigns" value={items.length} tone="indigo" loading={loading} />
        <AdminStatCard label="Active" value={activeCount} tone="emerald" loading={loading} />
        <AdminStatCard label="Total Entries" value={totalSubs} tone="violet" loading={loading} />
        <AdminStatCard label="Ended" value={endedCount} tone="rose" loading={loading} />
      </AdminStatGrid>

      <AdminGlassCard className="overflow-hidden p-0">
        {loading ? null : items.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Gift className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            এখনও কোনো offer তৈরি হয়নি। প্রথম campaign তৈরি করুন।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Campaign</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Entries</th>
                  <th className="text-left px-4 py-3">Winners</th>
                  <th className="text-left px-4 py-3">Window</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-white/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">/offer/{c.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${
                        c.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                        c.status === "ended" ? "bg-slate-100 text-slate-600 ring-slate-200" :
                        "bg-violet-50 text-violet-700 ring-violet-200"
                      }`}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{c.total_submissions || 0}</td>
                    <td className="px-4 py-3 text-slate-700">{c.winner_count}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : "—"}
                      {" → "}
                      {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : "∞"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => copyLink(c.slug)} title="Copy public link" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><Copy className="w-3.5 h-3.5" /></button>
                        <Link to="/offer/$slug" params={{ slug: c.slug }} target="_blank" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><ExternalLink className="w-3.5 h-3.5" /></Link>
                        <Link to="/Mahbub214/offers/$id" params={{ id: c.id }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil className="w-3.5 h-3.5" /></Link>
                        <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminGlassCard>

      {creating && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={() => setCreating(false)}>
          <div className="rounded-2xl ring-1 ring-white/60 bg-white/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(100,116,139,0.35)] max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">New campaign</h2>
            <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">Title</label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Eid Giveaway 2026"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-400"
            />
            <p className="text-[11px] text-slate-500 mt-2">তৈরি করার পর আপনি form fields, prizes, dates সব edit করতে পারবেন।</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="px-4 h-9 rounded-full ring-1 ring-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={createNew} className="px-4 h-9 rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 ring-1 ring-pink-700 text-white text-xs font-semibold">Create &amp; edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
