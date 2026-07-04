import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, Sparkles, Shuffle, Trophy,
  Eye, ExternalLink, FileText, Users, Settings as SettingsIcon, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { aiPickWinners, setWinnerManual } from "@/lib/offers.functions";

export const Route = createFileRoute("/admin/offers/$id")({
  component: AdminOfferEdit,
});

type FieldType = "text" | "email" | "phone" | "textarea" | "number" | "select" | "radio" | "checkbox";
type Field = {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
};
type Prize = { rank: number; title: string; description?: string };

type Campaign = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  status: "draft" | "active" | "ended";
  starts_at: string | null;
  ends_at: string | null;
  winner_count: number;
  prizes: Prize[];
  fields_schema: Field[];
  success_message: string | null;
  redirect_url: string | null;
  google_form_url: string | null;
  ai_selection_prompt: string | null;
  allow_multiple_entries: boolean;
  show_winners_publicly: boolean;
  total_submissions: number;
};

type Submission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  answers: Record<string, unknown>;
  is_winner: boolean;
  winner_rank: number | null;
  ai_score: number | null;
  ai_reason: string | null;
  created_at: string;
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
];

function AdminOfferEdit() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [c, setC] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"setup" | "form" | "prizes" | "submissions" | "winners">("setup");
  const [subs, setSubs] = useState<Submission[]>([]);
  const [picking, setPicking] = useState(false);

  const aiPickFn = useServerFn(aiPickWinners);
  const manualFn = useServerFn(setWinnerManual);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("offer_campaigns" as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) { toast.error(error?.message || "Not found"); setLoading(false); return; }
    const row = data as any;
    setC({
      ...row,
      prizes: Array.isArray(row.prizes) ? row.prizes : [],
      fields_schema: Array.isArray(row.fields_schema) ? row.fields_schema : [],
    });
    setLoading(false);
  }, [id]);

  const loadSubs = useCallback(async () => {
    const { data } = await supabase
      .from("offer_submissions" as never)
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });
    setSubs(((data ?? []) as unknown) as Submission[]);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "submissions" || tab === "winners") loadSubs(); }, [tab, loadSubs]);

  const save = async () => {
    if (!c) return;
    setSaving(true);
    const payload: any = {
      title: c.title,
      slug: c.slug,
      description: c.description,
      cover_image: c.cover_image,
      status: c.status,
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      winner_count: c.winner_count,
      prizes: c.prizes,
      fields_schema: c.fields_schema,
      success_message: c.success_message,
      redirect_url: c.redirect_url,
      google_form_url: c.google_form_url,
      ai_selection_prompt: c.ai_selection_prompt,
      allow_multiple_entries: c.allow_multiple_entries,
      show_winners_publicly: c.show_winners_publicly,
    };
    const { error } = await (supabase as any).from("offer_campaigns").update(payload).eq("id", c.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const addField = () => {
    if (!c) return;
    const id = "fld_" + Math.random().toString(36).slice(2, 8);
    setC({ ...c, fields_schema: [...c.fields_schema, { id, type: "text", label: "New field", required: false }] });
  };
  const removeField = (i: number) => {
    if (!c) return;
    setC({ ...c, fields_schema: c.fields_schema.filter((_, idx) => idx !== i) });
  };
  const moveField = (i: number, dir: -1 | 1) => {
    if (!c) return;
    const arr = [...c.fields_schema];
    const ni = i + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[i], arr[ni]] = [arr[ni], arr[i]];
    setC({ ...c, fields_schema: arr });
  };
  const updField = (i: number, patch: Partial<Field>) => {
    if (!c) return;
    const arr = [...c.fields_schema];
    arr[i] = { ...arr[i], ...patch };
    setC({ ...c, fields_schema: arr });
  };

  const addPrize = () => {
    if (!c) return;
    const next = c.prizes.length + 1;
    setC({ ...c, prizes: [...c.prizes, { rank: next, title: `Prize #${next}`, description: "" }] });
  };
  const removePrize = (i: number) => {
    if (!c) return;
    setC({ ...c, prizes: c.prizes.filter((_, idx) => idx !== i) });
  };

  const runPick = async (method: "ai" | "random") => {
    if (!c) return;
    if (!confirm(`এটা আগের winners reset করে ${c.winner_count} জন নতুন winner select করবে (${method.toUpperCase()})। চালিয়ে যাবেন?`)) return;
    setPicking(true);
    try {
      const res = await aiPickFn({ data: { campaignId: c.id, method } });
      toast.success(`${res.count} winner(s) selected via ${method.toUpperCase()}`);
      await loadSubs();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setPicking(false);
    }
  };

  const toggleWinner = async (s: Submission) => {
    try {
      await manualFn({ data: { submissionId: s.id, isWinner: !s.is_winner, rank: s.winner_rank ?? 1 } });
      await loadSubs();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const exportCsv = () => {
    if (!c || subs.length === 0) return;
    const headers = ["id", "name", "email", "phone", "is_winner", "winner_rank", "created_at"];
    const fieldKeys = c.fields_schema.map((f) => f.id);
    const allHeaders = [...headers, ...fieldKeys];
    const rows = subs.map((s) => {
      const base = [s.id, s.name, s.email, s.phone ?? "", s.is_winner ? "yes" : "no", s.winner_rank ?? "", s.created_at];
      const ans = fieldKeys.map((k) => JSON.stringify((s.answers as any)?.[k] ?? ""));
      return [...base, ...ans].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [allHeaders.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${c.slug}-entries.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !c) {
    return <div className="p-10 text-center text-slate-500">Loading…</div>;
  }

  const winners = subs.filter((s) => s.is_winner).sort((a, b) => (a.winner_rank ?? 99) - (b.winner_rank ?? 99));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin/offers" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 truncate">{c.title}</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">/offer/{c.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/offer/$slug" params={{ slug: c.slug }} target="_blank" className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full ring-1 ring-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50">
            <Eye className="w-3.5 h-3.5" /> Preview
          </Link>
          <button onClick={save} disabled={saving} className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 ring-1 ring-pink-700 text-white text-xs font-semibold disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {[
          { k: "setup", label: "Setup", icon: SettingsIcon },
          { k: "form", label: "Form Builder", icon: FileText },
          { k: "prizes", label: "Prizes", icon: Trophy },
          { k: "submissions", label: `Entries (${subs.length || c.total_submissions || 0})`, icon: Users },
          { k: "winners", label: `Winners (${winners.length})`, icon: Sparkles },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`px-3.5 h-10 inline-flex items-center gap-1.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${
              tab === t.k ? "border-pink-600 text-pink-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "setup" && (
        <Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Lbl name="Title">
              <input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} className="inp" />
            </Lbl>
            <Lbl name="Slug (URL)">
              <input value={c.slug} onChange={(e) => setC({ ...c, slug: e.target.value })} className="inp font-mono" />
            </Lbl>
            <Lbl name="Status">
              <select value={c.status} onChange={(e) => setC({ ...c, status: e.target.value as any })} className="inp">
                <option value="draft">Draft (hidden)</option>
                <option value="active">Active (live & accepting entries)</option>
                <option value="ended">Ended (no new entries)</option>
              </select>
            </Lbl>
            <Lbl name="Winner count">
              <input type="number" min={1} value={c.winner_count} onChange={(e) => setC({ ...c, winner_count: Math.max(1, Number(e.target.value)) })} className="inp" />
            </Lbl>
            <Lbl name="Starts at">
              <input type="datetime-local" value={toLocalInput(c.starts_at)}
                onChange={(e) => setC({ ...c, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="inp" />
            </Lbl>
            <Lbl name="Ends at">
              <input type="datetime-local" value={toLocalInput(c.ends_at)}
                onChange={(e) => setC({ ...c, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="inp" />
            </Lbl>
            <Lbl name="Cover image URL" full>
              <input value={c.cover_image ?? ""} onChange={(e) => setC({ ...c, cover_image: e.target.value || null })} className="inp" placeholder="https://…" />
            </Lbl>
            <Lbl name="Description (shown above form)" full>
              <textarea value={c.description ?? ""} onChange={(e) => setC({ ...c, description: e.target.value })} className="inp min-h-[80px]" />
            </Lbl>
            <Lbl name="Success message" full>
              <textarea value={c.success_message ?? ""} onChange={(e) => setC({ ...c, success_message: e.target.value })} className="inp min-h-[60px]" placeholder="ধন্যবাদ! …" />
            </Lbl>
            <Lbl name="Redirect URL (after submit, optional)">
              <input value={c.redirect_url ?? ""} onChange={(e) => setC({ ...c, redirect_url: e.target.value || null })} className="inp" placeholder="/thank-you" />
            </Lbl>
            <Lbl name="Google Form URL (optional fallback)">
              <input value={c.google_form_url ?? ""} onChange={(e) => setC({ ...c, google_form_url: e.target.value || null })} className="inp" placeholder="https://forms.gle/…" />
            </Lbl>
            <Lbl name="AI winner-pick criteria (optional)" full>
              <textarea
                value={c.ai_selection_prompt ?? ""}
                onChange={(e) => setC({ ...c, ai_selection_prompt: e.target.value })}
                className="inp min-h-[70px]"
                placeholder="e.g. Prefer participants who answered the creative question with sincerity. Ignore one-word answers."
              />
            </Lbl>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={c.allow_multiple_entries} onChange={(e) => setC({ ...c, allow_multiple_entries: e.target.checked })} />
              Allow multiple entries per email
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={c.show_winners_publicly} onChange={(e) => setC({ ...c, show_winners_publicly: e.target.checked })} />
              Show winners publicly on the offer page
            </label>
          </div>
        </Card>
      )}

      {tab === "form" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">Form fields participants will fill out. <b>Name</b>, <b>Email</b>, <b>Phone</b> are special — keep their IDs (<code>fld_name</code>, <code>fld_email</code>, <code>fld_phone</code>) for proper handling.</p>
            <button onClick={addField} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold"><Plus className="w-3.5 h-3.5" /> Add field</button>
          </div>
          <div className="space-y-2">
            {c.fields_schema.map((f, i) => (
              <div key={f.id} className="rounded-xl ring-1 ring-slate-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 pt-1.5">
                    <button onClick={() => moveField(i, -1)} className="text-slate-400 hover:text-slate-700 text-xs">▲</button>
                    <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                    <button onClick={() => moveField(i, 1)} className="text-slate-400 hover:text-slate-700 text-xs">▼</button>
                  </div>
                  <div className="flex-1 grid md:grid-cols-3 gap-2">
                    <input value={f.label} onChange={(e) => updField(i, { label: e.target.value })} className="inp" placeholder="Question label" />
                    <select value={f.type} onChange={(e) => updField(i, { type: e.target.value as FieldType })} className="inp">
                      {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input value={f.placeholder ?? ""} onChange={(e) => updField(i, { placeholder: e.target.value })} className="inp" placeholder="Placeholder (optional)" />
                    {(f.type === "select" || f.type === "radio") && (
                      <input
                        value={(f.options ?? []).join(", ")}
                        onChange={(e) => updField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                        className="inp md:col-span-2"
                        placeholder="Options (comma-separated)"
                      />
                    )}
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 px-2">
                      <input type="checkbox" checked={f.required} onChange={(e) => updField(i, { required: e.target.checked })} />
                      Required
                    </label>
                  </div>
                  <button onClick={() => removeField(i)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1 ml-7">id: {f.id}</div>
              </div>
            ))}
            {c.fields_schema.length === 0 && (
              <div className="text-center text-slate-500 py-8 text-sm">কোনো field নাই। উপরে "Add field" চাপুন।</div>
            )}
          </div>
        </Card>
      )}

      {tab === "prizes" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">Winner-দের জন্য prizes। প্রতিটি rank-এ আলাদা prize দিতে পারবেন।</p>
            <button onClick={addPrize} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold"><Plus className="w-3.5 h-3.5" /> Add prize</button>
          </div>
          <div className="space-y-2">
            {c.prizes.map((p, i) => (
              <div key={i} className="rounded-xl ring-1 ring-slate-200 bg-white p-3 flex items-center gap-2">
                <div className="w-10 h-10 grid place-items-center rounded-full bg-violet-100 text-violet-700 font-bold">#{p.rank}</div>
                <input value={p.title} onChange={(e) => { const arr = [...c.prizes]; arr[i] = { ...arr[i], title: e.target.value }; setC({ ...c, prizes: arr }); }} className="inp flex-1" placeholder="Prize title" />
                <input value={p.description ?? ""} onChange={(e) => { const arr = [...c.prizes]; arr[i] = { ...arr[i], description: e.target.value }; setC({ ...c, prizes: arr }); }} className="inp flex-1" placeholder="Description" />
                <button onClick={() => removePrize(i)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "submissions" && (
        <Card className="p-0">
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
            <h3 className="font-bold text-slate-900">All Entries ({subs.length})</h3>
            <button onClick={exportCsv} disabled={subs.length === 0} className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full ring-1 ring-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Answers</th>
                  <th className="text-left px-4 py-3">Submitted</th>
                  <th className="text-left px-4 py-3">Winner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-white/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.email}</td>
                    <td className="px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] max-w-xs truncate" title={JSON.stringify(s.answers)}>{JSON.stringify(s.answers)}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleWinner(s)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${
                        s.is_winner ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-slate-50 text-slate-500 ring-slate-200"
                      }`}>{s.is_winner ? `Winner #${s.winner_rank ?? 1}` : "Mark as winner"}</button>
                    </td>
                  </tr>
                ))}
                {subs.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-slate-500 py-10">এখনও কোনো entry আসেনি।</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "winners" && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-pink-600" /> Auto-pick winners</h3>
                <p className="text-sm text-slate-600 mt-1">
                  AI আপনার criteria অনুযায়ী top <b>{c.winner_count}</b> জন বেছে নিবে।
                  বর্তমান entries: <b>{subs.length}</b>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => runPick("ai")}
                  disabled={picking || subs.length === 0}
                  className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 ring-1 ring-violet-700 text-white text-sm font-semibold disabled:opacity-50 shadow-[0_8px_22px_-8px_rgba(139,92,246,0.7)]"
                >
                  <Sparkles className="w-4 h-4" /> {picking ? "Picking…" : "AI Pick"}
                </button>
                <button
                  onClick={() => runPick("random")}
                  disabled={picking || subs.length === 0}
                  className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl ring-1 ring-slate-200 bg-white text-slate-700 text-sm font-semibold disabled:opacity-50 hover:bg-slate-50"
                >
                  <Shuffle className="w-4 h-4" /> Random Pick
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-0">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Selected winners ({winners.length})</h3>
            </div>
            {winners.length === 0 ? (
              <div className="p-10 text-center text-slate-500"><Trophy className="w-10 h-10 mx-auto text-slate-300 mb-2" />এখনও winner select করা হয়নি।</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {winners.map((w) => {
                  const prize = c.prizes.find((p) => p.rank === w.winner_rank);
                  return (
                    <div key={w.id} className="p-4 flex items-start gap-3">
                      <div className="w-10 h-10 grid place-items-center rounded-full bg-gradient-to-br from-violet-400 to-orange-500 text-white font-bold shadow-sm">#{w.winner_rank}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900">{w.name}</div>
                        <div className="text-xs text-slate-500">{w.email} · {w.phone ?? "no phone"}</div>
                        {prize && <div className="text-xs text-violet-700 mt-1">🏆 {prize.title}</div>}
                        {w.ai_reason && <div className="text-[11px] text-slate-600 mt-1 italic">"{w.ai_reason}"</div>}
                        {w.ai_score != null && <div className="text-[10px] text-violet-600 font-bold mt-1">AI score: {w.ai_score}</div>}
                      </div>
                      <button onClick={() => toggleWinner(w)} className="text-xs text-slate-400 hover:text-rose-600">Remove</button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      <style>{`
        .inp { width: 100%; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:8px 12px; color:#0f172a; font-size:13px; outline:none; }
        .inp:focus { border-color:#ec4899; box-shadow:0 0 0 3px rgba(236,72,153,0.12); }
      `}</style>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl ring-1 ring-slate-200 bg-white shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>;
}
function Lbl({ name, children, full }: { name: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1 block">{name}</span>
      {children}
    </label>
  );
}
