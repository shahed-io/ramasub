import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, Plus, ArrowLeft, Loader2, Check, Upload, ArrowDownCircle, ArrowUpCircle, Gift, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { rememberReturnTo } from "@/lib/auth-return-to";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "My Wallet — AccessNow BD" }] }),
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

const typeMeta: Record<Txn["type"], { label: string; icon: any; color: string }> = {
  topup:      { label: "Top-up",     icon: ArrowDownCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  refund:     { label: "Refund",     icon: RefreshCw,       color: "text-blue-600 bg-blue-50 border-blue-200" },
  cashback:   { label: "Cashback",   icon: Sparkles,        color: "text-amber-600 bg-amber-50 border-amber-200" },
  referral:   { label: "Referral",   icon: Gift,            color: "text-pink-600 bg-pink-50 border-pink-200" },
  spend:      { label: "Order pay",  icon: ArrowUpCircle,   color: "text-rose-600 bg-rose-50 border-rose-200" },
  adjustment: { label: "Adjustment", icon: Wallet,          color: "text-violet-600 bg-violet-50 border-violet-200" },
};

function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);

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

  if (authLoading || !user) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="dark-adapt min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Balance card */}
        <div className="rounded-3xl p-6 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)" }}>
          <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
            <Wallet className="w-4 h-4" /> Wallet Balance
          </div>
          <div className="mt-2 text-5xl font-black tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            ৳{balance.toLocaleString()}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowTopup(true)}
              className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-white text-violet-700 text-sm font-bold hover:bg-white/90 shadow"
            >
              <Plus className="w-4 h-4" /> Top up
            </button>
            <Link to="/" className="inline-flex items-center px-4 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-semibold">
              Shop now
            </Link>
          </div>
        </div>

        {/* Top-up history */}
        {topups.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-700">Top-up requests</div>
            <ul className="divide-y divide-slate-100">
              {topups.map((t) => (
                <li key={t.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">৳{Number(t.amount).toLocaleString()} · {t.method.toUpperCase()}</div>
                    <div className="text-[11px] text-slate-500">{new Date(t.created_at).toLocaleString()}{t.admin_note ? ` · ${t.admin_note}` : ""}</div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    t.status === "approved" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : t.status === "rejected" ? "text-rose-700 bg-rose-50 border-rose-200"
                    : "text-amber-700 bg-amber-50 border-amber-200"
                  }`}>{t.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Transactions */}
        <div className="mt-6 rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-700">Transactions</div>
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</div>
          ) : txns.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No transactions yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {txns.map((t) => {
                const m = typeMeta[t.type];
                const Icon = m.icon;
                const sign = Number(t.amount) > 0 ? "+" : "−";
                return (
                  <li key={t.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl grid place-items-center border ${m.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{t.reason || m.label}</div>
                        <div className="text-[11px] text-slate-500">{new Date(t.created_at).toLocaleString()} · {m.label}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${Number(t.amount) > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {sign}৳{Math.abs(Number(t.amount)).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500">Bal: ৳{Number(t.balance_after).toLocaleString()}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {showTopup && <TopupModal onClose={() => setShowTopup(false)} onDone={() => { setShowTopup(false); load(); }} userId={user.id} />}
    </div>
  );
}

function TopupModal({ onClose, onDone, userId }: { onClose: () => void; onDone: () => void; userId: string }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [path, setPath] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) { setErr("Max 5MB"); return; }
    setUploading(true); setErr(null);
    try {
      const ext = f.name.split(".").pop() || "jpg";
      const p = `${userId}/wallet-topups/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("payment-screenshots").upload(p, f, { upsert: false });
      if (error) throw error;
      setPath(p);
    } catch (e) { setErr(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    setErr(null);
    const amt = Number(amount);
    if (!amt || amt < 10) { setErr("Minimum top-up ৳10"); return; }
    if (!/^01[3-9]\d{8}$/.test(sender)) { setErr("Enter the 11-digit number you sent from"); return; }
    if (trx.trim().length < 6) { setErr("TrxID looks too short"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("wallet_topups").insert({
        user_id: userId, amount: amt, method, sender_number: sender, txn_id: trx.trim().toUpperCase(),
        screenshot_path: path || null, status: "pending",
      } as any);
      if (error) throw error;
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl text-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Top up wallet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <p className="text-xs text-slate-500 mt-1">Send money to our bKash/Nagad number, then submit the details below. An admin will approve it shortly.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">Amount (৳)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" className="w-full h-11 px-3 mt-1 rounded-xl border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Method</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["bkash", "nagad"] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`h-10 rounded-xl border text-sm font-semibold ${method === m ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-700"}`}>
                  {m === "bkash" ? "bKash" : "Nagad"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Your sender number</label>
            <input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="01XXXXXXXXX" className="w-full h-11 px-3 mt-1 rounded-xl border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Transaction ID</label>
            <input value={trx} onChange={(e) => setTrx(e.target.value.toUpperCase())} placeholder="8F3K2P9X" className="w-full h-11 px-3 mt-1 rounded-xl border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Screenshot (optional)</label>
            <label className="mt-1 block rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-4 text-center cursor-pointer hover:bg-slate-100 text-sm">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Uploading…</>
                : path ? <span className="text-emerald-600 font-semibold"><Check className="w-4 h-4 inline mr-1" />Uploaded</span>
                : <><Upload className="w-4 h-4 inline mr-1" />Select image</>}
            </label>
          </div>
        </div>

        {err && <p className="mt-3 text-xs text-rose-600 text-center">{err}</p>}

        <button onClick={submit} disabled={busy}
          className="mt-4 w-full h-11 rounded-full text-white text-sm font-bold disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)" }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
          Submit for approval
        </button>
      </div>
    </div>
  );
}
