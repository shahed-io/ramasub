import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Sparkles, Calendar, Users, CheckCircle2, ExternalLink, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/offer/$slug")({
  component: OfferPage,
  errorComponent: ({ error }) => (
    <div className="max-w-2xl mx-auto p-10 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Couldn't load offer</h1>
      <p className="text-slate-500 mt-2">{(error as Error)?.message}</p>
      <Link to="/" className="inline-block mt-4 text-pink-600 font-semibold">← Back to home</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="max-w-2xl mx-auto p-10 text-center">
      <Gift className="w-12 h-12 mx-auto text-slate-300 mb-3" />
      <h1 className="text-2xl font-bold text-slate-900">Offer not found</h1>
      <p className="text-slate-500 mt-2">এই offer-টি আর available নেই।</p>
      <Link to="/" className="inline-block mt-4 text-pink-600 font-semibold">← Back to home</Link>
    </div>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Offer · Rama Sub` },
      { name: "description", content: "Join our exclusive giveaway and win amazing prizes." },
      { property: "og:title", content: "Exclusive Offer · Rama Sub" },
      { property: "og:url", content: `${SITE_URL}/offer/${params.slug}` },
    ],
  }),
});

type Field = {
  id: string; type: string; label: string; required: boolean;
  placeholder?: string; options?: string[]; helpText?: string;
};
type Prize = { rank: number; title: string; description?: string };
type Campaign = {
  id: string; slug: string; title: string; description: string | null;
  cover_image: string | null; status: string;
  starts_at: string | null; ends_at: string | null;
  winner_count: number; prizes: Prize[]; fields_schema: Field[];
  success_message: string | null; redirect_url: string | null;
  google_form_url: string | null;
  allow_multiple_entries: boolean; show_winners_publicly: boolean;
  total_submissions: number;
};
type Winner = {
  id: string; name: string; winner_rank: number | null;
  ai_reason: string | null;
};

function OfferPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [c, setC] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("offer_campaigns" as never)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) { setLoading(false); throw notFound(); }
      const row = data as any;
      const camp: Campaign = {
        ...row,
        prizes: Array.isArray(row.prizes) ? row.prizes : [],
        fields_schema: Array.isArray(row.fields_schema) ? row.fields_schema : [],
      };
      setC(camp);
      if (camp.status === "ended" && camp.show_winners_publicly) {
        const { data: w } = await supabase
          .from("offer_winners_public" as never)
          .select("id,name,winner_rank,ai_reason")
          .eq("campaign_id", camp.id)
          .order("winner_rank", { ascending: true });
        setWinners(((w ?? []) as unknown) as Winner[]);
      }
      setLoading(false);
    })().catch((e) => { console.error(e); setLoading(false); });
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!c) return;
    const name = String(values.fld_name ?? "").trim();
    const email = String(values.fld_email ?? "").trim();
    const phone = String(values.fld_phone ?? "").trim() || null;
    if (!name || !email) return toast.error("Name এবং email আবশ্যক।");
    // Validate required fields
    for (const f of c.fields_schema) {
      if (f.required && !values[f.id]) {
        return toast.error(`"${f.label}" আবশ্যক।`);
      }
    }
    // Dedupe check
    if (!c.allow_multiple_entries) {
      const { data: existing } = await supabase
        .from("offer_submissions" as never)
        .select("id")
        .eq("campaign_id", c.id)
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (existing) return toast.error("আপনি এই offer-এ ইতিমধ্যে অংশগ্রহণ করেছেন।");
    }
    setSubmitting(true);
    const payload: any = {
      campaign_id: c.id,
      user_id: user?.id ?? null,
      name, email, phone,
      answers: values,
      user_agent: navigator.userAgent.slice(0, 200),
    };
    const { error } = await supabase.from("offer_submissions" as never).insert(payload);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setDone(true);
    if (c.redirect_url) {
      setTimeout(() => { window.location.href = c.redirect_url!; }, 1500);
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">Loading…</div>;
  if (!c) return null;

  const ended = c.status === "ended" || (c.ends_at && new Date(c.ends_at) < new Date());
  const notStarted = c.starts_at && new Date(c.starts_at) > new Date();
  const canSubmit = c.status === "active" && !ended && !notStarted;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-fuchsia-50 to-violet-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Cover */}
        {c.cover_image && (
          <div className="rounded-3xl overflow-hidden mb-5 shadow-xl ring-1 ring-white/60 aspect-[16/9] bg-slate-100">
            <img src={c.cover_image} alt={c.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white text-xs font-bold uppercase tracking-wider shadow-md mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Exclusive Giveaway
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-pink-700 via-fuchsia-700 to-violet-700 bg-clip-text text-transparent">
            {c.title}
          </h1>
          {c.description && <p className="text-slate-700 mt-3 whitespace-pre-wrap">{c.description}</p>}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500 flex-wrap">
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c.total_submissions} entries</span>
            <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> {c.winner_count} winner{c.winner_count > 1 ? "s" : ""}</span>
            {c.ends_at && <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> ends {new Date(c.ends_at).toLocaleDateString()}</span>}
          </div>
        </div>

        {/* Prizes */}
        {c.prizes.length > 0 && (
          <div className="rounded-2xl bg-white/80 backdrop-blur-md ring-1 ring-white/60 shadow-lg p-5 mb-5">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Prizes</h2>
            <div className="space-y-2">
              {c.prizes.map((p) => (
                <div key={p.rank} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 ring-1 ring-amber-100">
                  <div className="w-10 h-10 grid place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold shadow">#{p.rank}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900">{p.title}</div>
                    {p.description && <div className="text-xs text-slate-600">{p.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Winners (if ended) */}
        {ended && c.show_winners_publicly && winners.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 ring-1 ring-amber-200 shadow-lg p-5 mb-5">
            <h2 className="font-bold text-amber-900 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" /> 🎉 Winners</h2>
            <div className="space-y-2">
              {winners.map((w) => {
                const prize = c.prizes.find((p) => p.rank === w.winner_rank);
                return (
                  <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/70 ring-1 ring-white">
                    <div className="w-9 h-9 grid place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">#{w.winner_rank}</div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{w.name}</div>
                      {prize && <div className="text-xs text-amber-700">🏆 {prize.title}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form */}
        {done ? (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 ring-1 ring-emerald-200 shadow-lg p-8 text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-600 mb-3" />
            <h2 className="text-xl font-bold text-emerald-900">{c.success_message || "ধন্যবাদ! আপনার entry সফলভাবে গৃহীত হয়েছে।"}</h2>
            <Link to="/" className="inline-block mt-4 text-emerald-700 font-semibold underline">← Back to home</Link>
          </div>
        ) : !canSubmit ? (
          <div className="rounded-2xl bg-slate-100 ring-1 ring-slate-200 p-6 text-center">
            <p className="text-slate-700 font-semibold">
              {ended ? "এই offer শেষ হয়ে গেছে।" : notStarted ? `Offer শুরু হবে ${new Date(c.starts_at!).toLocaleString()}` : "এই offer-এ এখন entry নেওয়া হচ্ছে না।"}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl bg-white/90 backdrop-blur-md ring-1 ring-white/60 shadow-lg p-5 space-y-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2"><Gift className="w-4 h-4 text-pink-600" /> Join the giveaway</h2>
            {c.fields_schema.map((f) => (
              <div key={f.id}>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {f.label} {f.required && <span className="text-rose-500">*</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    required={f.required}
                    placeholder={f.placeholder}
                    value={values[f.id] ?? ""}
                    onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[80px] outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  />
                ) : f.type === "select" ? (
                  <select
                    required={f.required}
                    value={values[f.id] ?? ""}
                    onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  >
                    <option value="">— Select —</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "radio" ? (
                  <div className="flex flex-wrap gap-3">
                    {(f.options ?? []).map((o) => (
                      <label key={o} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <input type="radio" name={f.id} value={o} checked={values[f.id] === o}
                          onChange={() => setValues({ ...values, [f.id]: o })} required={f.required} />
                        {o}
                      </label>
                    ))}
                  </div>
                ) : f.type === "checkbox" ? (
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={!!values[f.id]}
                      onChange={(e) => setValues({ ...values, [f.id]: e.target.checked })} required={f.required} />
                    {f.placeholder || "I agree"}
                  </label>
                ) : (
                  <input
                    type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "number" ? "number" : "text"}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={values[f.id] ?? ""}
                    onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                  />
                )}
                {f.helpText && <p className="text-[11px] text-slate-500 mt-1">{f.helpText}</p>}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-violet-600 text-white font-bold text-base shadow-[0_10px_30px_-10px_rgba(219,39,119,0.7)] disabled:opacity-50 hover:opacity-95"
            >
              {submitting ? "Submitting…" : "🎁 Submit Entry"}
            </button>

            {c.google_form_url && (
              <a href={c.google_form_url} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-slate-500 hover:text-pink-600 underline">
                <ExternalLink className="w-3 h-3 inline mr-0.5" /> Alternate Google Form link
              </a>
            )}
          </form>
        )}

        <div className="text-center mt-6 text-xs text-slate-400">
          Powered by Rama Sub
        </div>
      </div>
    </div>
  );
}
