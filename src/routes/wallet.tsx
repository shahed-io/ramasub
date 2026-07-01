import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet, ArrowLeft, Loader2, Check, Upload, RefreshCw, History,
  ArrowDownCircle, ArrowUpCircle, Gift, Sparkles, Copy as CopyIcon, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { usePaymentMethods } from "@/hooks/useShopConfig";
import { rememberReturnTo } from "@/lib/auth-return-to";
import { notifyTelegram } from "@/lib/telegram";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "My Wallet — Rama Sub" }] }),
});

type Txn = {
  id: string;
  amount: number;
  type: "topup" | "refund" | "cashback" | "referral" | "spend" | "adjustment";
  reason: string | null;
  balance_after: number;
  created_at: string;
  ref_order_id: string | null;
};

type Topup = {
  id: string;
  amount: number;
  method: string;
  status: "pending" | "approved" | "rejected";
  txn_id: string | null;
  admin_note: string | null;
  created_at: string;
};

const typeMeta: Record<Txn["type"], { label: string; icon: any; tone: string }> = {
  topup:      { label: "Top-up",     icon: ArrowDownCircle, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  refund:     { label: "Refund",     icon: RefreshCw,       tone: "text-blue-600 bg-blue-50 border-blue-200" },
  cashback:   { label: "Cashback",   icon: Sparkles,        tone: "text-amber-600 bg-amber-50 border-amber-200" },
  referral:   { label: "Referral",   icon: Gift,            tone: "text-pink-600 bg-pink-50 border-pink-200" },
  spend:      { label: "Order pay",  icon: ArrowUpCircle,   tone: "text-rose-600 bg-rose-50 border-rose-200" },
  adjustment: { label: "Adjustment", icon: Wallet,          tone: "text-violet-600 bg-violet-50 border-violet-200" },
};

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

type Step = 1 | 2 | 3;

function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [balance, setBalance] = useState<number>(0);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);

  // Top-up flow state
  const [step, setStep] = useState<Step>(1);
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>("");

  const { data: walletMethods } = usePaymentMethods("wallet");
  const availableMethods = useMemo(() => {
    const list = (walletMethods ?? []).filter((m) => m.name);
    return list.length ? list : [
      { id: "bkash", name: "bKash", number: "01319029214", color: "", brand_color: "#E2136E", send_money_label: "Send Money" },
      { id: "nagad", name: "Nagad", number: "01319029214", color: "", brand_color: "#EC1C24", send_money_label: "Send Money" },
    ];
  }, [walletMethods]);
  const [method, setMethod] = useState<string>("");
  useEffect(() => {
    if (!method && availableMethods[0]?.name) setMethod(availableMethods[0].name.toLowerCase());
  }, [availableMethods, method]);
  const selected = availableMethods.find((m) => (m.name || "").toLowerCase() === method) || availableMethods[0];

  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [path, setPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [w, t, tp] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("wallet_topups").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);
    setBalance(Number(w.data?.balance ?? 0));
    setTxns((t.data as any) || []);
    setTopups((tp.data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { rememberReturnTo(); navigate({ to: "/login" }); }
  }, [authLoading, user, navigate]);

  useEffect(() => { load(); }, [load]);

  const finalAmount = useMemo(() => {
    if (amount) return amount;
    const n = Number(customAmount);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amount, customAmount]);

  const goStep2 = () => {
    setErr(null);
    if (!finalAmount || finalAmount < 10) { setErr("Minimum top-up ৳10"); return; }
    setStep(2);
  };

  const goStep3 = () => {
    setErr(null);
    if (!method) { setErr("Select a payment method"); return; }
    if (!/^01[3-9]\d{8}$/.test(sender)) { setErr("Enter the 11-digit number you sent from"); return; }
    if (trx.trim().length < 6) { setErr("TrxID looks too short"); return; }
    setStep(3);
  };

  const uploadScreenshot = async (f: File) => {
    if (!user) return;
    if (f.size > 5 * 1024 * 1024) { setErr("Max 5MB"); return; }
    setUploading(true); setErr(null);
    try {
      const ext = f.name.split(".").pop() || "jpg";
      const p = `${user.id}/wallet-topups/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("payment-screenshots").upload(p, f, { upsert: false });
      if (error) throw error;
      setPath(p);
    } catch (e) { setErr(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!user) return;
    setErr(null); setSubmitting(true);
    try {
      const { error } = await supabase.from("wallet_topups").insert({
        user_id: user.id, amount: finalAmount, method,
        sender_number: sender, txn_id: trx.trim().toUpperCase(),
        screenshot_path: path || null, status: "pending",
      } as any);
      if (error) throw error;
      notifyTelegram({
        event: "wallet_topup",
        title: "নতুন Wallet Top-up রিকোয়েস্ট",
        lines: [
          ["User", user.email ?? user.id],
          ["Amount", `৳${finalAmount}`],
          ["Method", method],
          ["Sender", sender],
          ["TxID", trx.trim().toUpperCase()],
        ],
        url: `https://ramasub.com/admin/wallet`,
      });
      setDone(true);
      // reset form
      setAmount(0); setCustomAmount(""); setSender(""); setTrx(""); setPath("");
      await load();
      setTimeout(() => { setDone(false); setStep(1); }, 2400);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  if (authLoading || !user) {
    return <div className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Top back link */}
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        {/* Page header card */}
        <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4 flex items-center gap-3 shadow-sm">
          <div className="w-11 h-11 rounded-2xl grid place-items-center text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-violet-700 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Wallet</h1>
            <p className="text-xs text-slate-500">Top-up &amp; transactions</p>
          </div>
        </div>

        {/* Balance hero */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6d28d9 50%, #7c3aed 100%)" }}>
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute right-10 bottom-2 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">My Wallet</div>
                <div className="text-[11px] text-white/75">Store Balance</div>
              </div>
            </div>
            <button onClick={load} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center transition" aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mt-5">
            <div className="text-5xl font-black tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              ৳{balance.toLocaleString()}
            </div>
            <div className="text-xs text-white/80 mt-0.5">Available Balance</div>
          </div>
        </div>

        {/* Stepper card */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {/* Stepper tabs */}
          <div className="grid grid-cols-3 border-b border-slate-100">
            {[
              { n: 1, label: "Select Amount" },
              { n: 2, label: "Payment" },
              { n: 3, label: "Confirm" },
            ].map((s) => {
              const active = step === s.n;
              const completed = step > s.n;
              return (
                <button
                  key={s.n}
                  onClick={() => {
                    if (s.n === 1) setStep(1);
                    if (s.n === 2 && finalAmount >= 10) setStep(2);
                    if (s.n === 3 && finalAmount >= 10 && method && /^01[3-9]\d{8}$/.test(sender) && trx.trim().length >= 6) setStep(3);
                  }}
                  className={`relative py-3 text-xs sm:text-sm font-semibold transition ${
                    active ? "text-violet-700" : completed ? "text-violet-500" : "text-slate-400"
                  }`}
                >
                  <span className="mr-1">{s.n}.</span>{s.label}
                  {active && <span className="absolute left-4 right-4 -bottom-px h-0.5 bg-violet-600 rounded-full" />}
                </button>
              );
            })}
          </div>

          {/* Step bodies */}
          <div className="p-5">
            {done && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 mb-4 text-sm font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" /> Top-up request submitted! Admin will verify shortly.
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-slate-900 mb-2">How much do you want to add?</div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_AMOUNTS.map((a) => {
                      const active = amount === a;
                      return (
                        <button
                          key={a}
                          onClick={() => { setAmount(a); setCustomAmount(""); }}
                          className={`px-4 h-9 rounded-full border text-sm font-bold tabular-nums transition ${
                            active
                              ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
                          }`}
                        >
                          ৳{a.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-500">
                    Or enter custom amount
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={10}
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
                    placeholder="Min ৳10"
                    className="w-full h-11 px-4 mt-1 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  />
                </div>

                {err && <p className="text-xs text-rose-600">{err}</p>}

                <button
                  onClick={goStep2}
                  disabled={finalAmount < 10}
                  className="w-full h-11 rounded-full text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1 shadow-md hover:shadow-lg transition"
                  style={{ background: "linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7)" }}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-slate-900 mb-2">Choose payment method</div>
                  <div className="grid grid-cols-2 gap-2">
                    {availableMethods.map((m) => {
                      const id = (m.name || "").toLowerCase();
                      const active = method === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setMethod(id)}
                          style={active && m.brand_color ? { borderColor: m.brand_color, color: m.brand_color, background: `${m.brand_color}14` } : undefined}
                          className={`h-12 rounded-xl border text-sm font-bold transition ${active ? "shadow-sm" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selected?.number && (
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-violet-50/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-bold">
                          {(selected as any).send_money_label || "Send Money"} ৳{finalAmount.toLocaleString()} to
                        </div>
                        <div className="text-xl font-black text-slate-900 tabular-nums mt-0.5">{selected.number}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(selected.number)}
                        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 h-9 rounded-full bg-white border border-slate-200 hover:border-violet-300 text-slate-700"
                      >
                        <CopyIcon className="w-3.5 h-3.5" /> Copy
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Your sender number</label>
                    <input
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      inputMode="numeric"
                      className="w-full h-11 px-3 mt-1 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transaction ID</label>
                    <input
                      value={trx}
                      onChange={(e) => setTrx(e.target.value.toUpperCase())}
                      placeholder="8F3K2P9X"
                      className="w-full h-11 px-3 mt-1 rounded-xl border border-slate-200 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Screenshot (optional)</label>
                  <label className="mt-1 block rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-4 text-center cursor-pointer hover:bg-slate-100 text-sm">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadScreenshot(f); }} />
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Uploading…</>
                      : path ? <span className="text-emerald-600 font-semibold"><Check className="w-4 h-4 inline mr-1" />Screenshot uploaded</span>
                      : <><Upload className="w-4 h-4 inline mr-1 text-slate-500" />Select image</>}
                  </label>
                </div>

                {err && <p className="text-xs text-rose-600">{err}</p>}

                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="h-11 px-5 rounded-full border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50">
                    Back
                  </button>
                  <button
                    onClick={goStep3}
                    className="flex-1 h-11 rounded-full text-white text-sm font-bold inline-flex items-center justify-center gap-1 shadow-md hover:shadow-lg transition"
                    style={{ background: "linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7)" }}
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="text-sm font-bold text-slate-900">Review &amp; confirm</div>
                <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
                  <Row label="Amount" value={`৳${finalAmount.toLocaleString()}`} strong />
                  <Row label="Method" value={(selected?.name || method).toString()} />
                  <Row label="Sent to" value={selected?.number || "—"} />
                  <Row label="Your number" value={sender} />
                  <Row label="Transaction ID" value={trx} />
                  <Row label="Screenshot" value={path ? "Uploaded" : "Not provided"} />
                </div>

                <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                  Admin will verify your transaction and credit your wallet balance. This usually takes a few minutes during business hours.
                </div>

                {err && <p className="text-xs text-rose-600">{err}</p>}

                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="h-11 px-5 rounded-full border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50">
                    Back
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="flex-1 h-11 rounded-full text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-md hover:shadow-lg transition"
                    style={{ background: "linear-gradient(90deg, #16a34a, #15803d)" }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Submit top-up
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pending top-up requests */}
        {topups.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" /> Top-up requests
            </div>
            <ul className="divide-y divide-slate-100">
              {topups.slice(0, 5).map((t) => (
                <li key={t.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 tabular-nums">৳{Number(t.amount).toLocaleString()} · {t.method.toUpperCase()}</div>
                    <div className="text-[11px] text-slate-500">{new Date(t.created_at).toLocaleString()}{t.admin_note ? ` · ${t.admin_note}` : ""}</div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    t.status === "approved" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : t.status === "rejected" ? "text-rose-700 bg-rose-50 border-rose-200"
                    : "text-amber-700 bg-amber-50 border-amber-200"
                  }`}>{t.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Transaction history */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-violet-600" /> Transaction History
            </div>
            <button onClick={load} className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500" aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</div>
          ) : txns.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">No transactions yet</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {txns.map((t) => {
                const m = typeMeta[t.type];
                const Icon = m.icon;
                const sign = Number(t.amount) > 0 ? "+" : "−";
                return (
                  <li key={t.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl grid place-items-center border ${m.tone}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{t.reason || m.label}</div>
                        <div className="text-[11px] text-slate-500">{new Date(t.created_at).toLocaleString()} · {m.label}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold tabular-nums ${Number(t.amount) > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {sign}৳{Math.abs(Number(t.amount)).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">Bal: ৳{Number(t.balance_after).toLocaleString()}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* How to use */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="text-sm font-bold text-slate-900 mb-3">How to use your wallet?</div>
          <ol className="space-y-2.5">
            {[
              'Top-up: Choose amount → Pay via BKash/Nagad → Enter TrxID',
              'Admin verifies payment and credits your wallet balance',
              'At checkout, select "Wallet" as payment method to pay instantly',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-white text-[11px] font-black" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm tabular-nums ${strong ? "font-black text-violet-700 text-base" : "font-bold text-slate-900"}`}>{value}</div>
    </div>
  );
}
