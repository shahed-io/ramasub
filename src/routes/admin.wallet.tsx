import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, Search, Plus, Minus, Check, X, Eye, Wallet, RefreshCw,
  TrendingUp, TrendingDown, Clock, Users, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getWalletScreenshotUrl } from "@/lib/wallet.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wallet")({
  component: AdminWalletPage,
});

type Topup = {
  id: string; user_id: string; amount: number; method: string; sender_number: string | null;
  txn_id: string | null; screenshot_path: string | null; status: "pending" | "approved" | "rejected";
  admin_note: string | null; created_at: string;
};
type WalletRow = { user_id: string; balance: number };
type Profile = { id: string; display_name: string | null; phone: string | null };
type Txn = {
  id: string; user_id: string; amount: number; type: string; reason: string | null;
  balance_after: number; created_at: string;
};
type ProfileEmail = Profile & { email?: string };
type Tab = "requests" | "customers" | "transactions";

const fmt = (n: number) => "৳" + Math.round(Number(n || 0)).toLocaleString("en-IN");
const fmt2 = (n: number) => "৳" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function initials(name?: string | null, fallback?: string) {
  const s = (name || fallback || "?").trim();
  return s.slice(0, 1).toUpperCase();
}

function statusPill(s: Topup["status"]) {
  if (s === "approved") return "bg-emerald-600 text-white ring-1 ring-emerald-700";
  if (s === "rejected") return "bg-rose-600 text-white ring-1 ring-rose-700";
  return "bg-amber-500 text-white ring-1 ring-amber-600";
}

function AdminWalletPage() {
  const [tab, setTab] = useState<Tab>("requests");
  const [topups, setTopups] = useState<Topup[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileEmail>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    const [t, w, tx] = await Promise.all([
      supabase.from("wallet_topups").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("wallets").select("user_id, balance").order("balance", { ascending: false }).limit(500),
      supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    const tList = (t.data ?? []) as unknown as Topup[];
    const wList = (w.data ?? []) as unknown as WalletRow[];
    const txList = (tx.data ?? []) as unknown as Txn[];
    setTopups(tList); setWallets(wList); setTxns(txList);

    const ids = Array.from(new Set([
      ...tList.map(r => r.user_id),
      ...wList.map(r => r.user_id),
      ...txList.map(r => r.user_id),
    ]));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, phone").in("id", ids);
      const map: Record<string, ProfileEmail> = {};
      ((ps ?? []) as unknown as Profile[]).forEach(p => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const totalWallet = wallets.reduce((s, w) => s + Number(w.balance || 0), 0);
    let credits = 0, debits = 0;
    txns.forEach(t => {
      const a = Number(t.amount || 0);
      if (a > 0) credits += a; else debits += Math.abs(a);
    });
    const pending = topups.filter(t => t.status === "pending").length;
    return { totalWallet, credits, debits, pending };
  }, [wallets, txns, topups]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Section heading */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              <Wallet className="h-6 w-6 text-violet-600" />
              Wallet Manager
            </h2>
            <p className="text-sm text-slate-500 mt-1">Manage customer wallets and top-up requests</p>
          </div>
          <button
            onClick={() => load(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Wallet" icon={Wallet} iconColor="text-violet-500" value={fmt2(stats.totalWallet)} valueColor="text-slate-900" />
          <StatCard label="Total Credits" icon={TrendingUp} iconColor="text-emerald-500" value={fmt(stats.credits)} valueColor="text-emerald-600" />
          <StatCard label="Total Debits" icon={TrendingDown} iconColor="text-rose-500" value={fmt2(stats.debits)} valueColor="text-rose-600" />
          <StatCard label="Pending" icon={Clock} iconColor="text-amber-500" value={String(stats.pending)} valueColor="text-slate-900" />
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* Left: tabs + list */}
          <div className="space-y-4">
            <div className="inline-flex p-1 rounded-2xl bg-slate-100/80">
              {([
                ["requests", "Requests", Clock],
                ["customers", "Customers", Users],
                ["transactions", "Transactions", History],
              ] as [Tab, string, React.ComponentType<{ className?: string }>][]).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 transition ${
                    tab === id
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/30"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="p-16 grid place-items-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : tab === "requests" ? (
                <RequestsList topups={topups} profiles={profiles} reload={() => load(true)} />
              ) : tab === "customers" ? (
                <CustomersList wallets={wallets} profiles={profiles} onSelect={(uid) => setSelectedUser(uid)} selected={selectedUser} />
              ) : (
                <TransactionsList txns={txns} profiles={profiles} />
              )}
            </div>
          </div>

          {/* Right: manual adjust */}
          <ManualAdjustPanel
            wallets={wallets}
            profiles={profiles}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
            onDone={() => load(true)}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, icon: Icon, iconColor, value, valueColor }: {
  label: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; value: string; valueColor: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-2xl font-extrabold ${valueColor}`}>{value}</div>
    </div>
  );
}

function RequestsList({ topups, profiles, reload }: { topups: Topup[]; profiles: Record<string, ProfileEmail>; reload: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const getSigned = useServerFn(getWalletScreenshotUrl);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("approve_wallet_topup" as any, { _topup_id: id, _admin_note: null });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Approved & wallet credited"); reload(); }
  };
  const reject = async (id: string) => {
    const note = window.prompt("Reason for rejection?") || "Rejected";
    setBusy(id);
    const { error } = await supabase.rpc("reject_wallet_topup" as any, { _topup_id: id, _admin_note: note });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Rejected"); reload(); }
  };
  const view = async (path: string) => {
    try {
      const r = await getSigned({ data: { path } });
      setPreviewUrl(r.url);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  if (topups.length === 0) {
    return <div className="p-12 text-center text-slate-500 text-sm">No top-up requests yet.</div>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {topups.map((r) => {
        const p = profiles[r.user_id];
        const name = p?.display_name || "Customer";
        return (
          <div key={r.id} className="px-5 py-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600 font-semibold">
                {initials(name, r.user_id)}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="font-semibold text-slate-800">{name}</div>
                <div className="text-xs text-slate-500">{p?.phone || r.user_id.slice(0, 12)}…</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-slate-900">{fmt(Number(r.amount))}</div>
                <span className={`mt-1 inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-sm ${statusPill(r.status)}`}>
                  {r.status}
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-xs text-slate-600">
              <div><span className="font-semibold text-slate-500">Method:</span> {r.method}</div>
              <div className="truncate"><span className="font-semibold text-slate-500">TrxID:</span> {r.txn_id || "—"}</div>
              <div><span className="font-semibold text-slate-500">Date:</span> {new Date(r.created_at).toLocaleString()}</div>
              {r.sender_number && <div><span className="font-semibold text-slate-500">Sender:</span> {r.sender_number}</div>}
            </div>
            {r.status === "pending" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.screenshot_path && (
                  <button onClick={() => view(r.screenshot_path!)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs hover:bg-slate-50">
                    <Eye className="h-3.5 w-3.5" /> View screenshot
                  </button>
                )}
                <button disabled={busy === r.id} onClick={() => approve(r.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button disabled={busy === r.id} onClick={() => reject(r.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50">
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            )}
          </div>
        );
      })}

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="screenshot" className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

function CustomersList({ wallets, profiles, onSelect, selected }: {
  wallets: WalletRow[]; profiles: Record<string, ProfileEmail>; onSelect: (uid: string) => void; selected: string | null;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return wallets;
    return wallets.filter(w => {
      const p = profiles[w.user_id];
      return w.user_id.includes(s) || (p?.display_name || "").toLowerCase().includes(s) || (p?.phone || "").includes(s);
    });
  }, [wallets, profiles, q]);

  return (
    <div>
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / phone / id…" className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
      </div>
      <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No customers.</div>
        ) : filtered.map((w) => {
          const p = profiles[w.user_id];
          const name = p?.display_name || "Customer";
          const isSel = selected === w.user_id;
          return (
            <button key={w.user_id} onClick={() => onSelect(w.user_id)} className={`w-full flex items-center gap-3 px-5 py-3 text-left transition ${isSel ? "bg-violet-50" : "hover:bg-slate-50"}`}>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600 font-semibold">{initials(name, w.user_id)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate">{name}</div>
                <div className="text-xs text-slate-500 truncate">{p?.phone || w.user_id.slice(0, 18)}…</div>
              </div>
              <div className="font-bold text-violet-700">{fmt(Number(w.balance))}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TransactionsList({ txns, profiles }: { txns: Txn[]; profiles: Record<string, ProfileEmail> }) {
  if (txns.length === 0) return <div className="p-12 text-center text-slate-500 text-sm">No transactions.</div>;
  return (
    <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
      {txns.map((t) => {
        const name = profiles[t.user_id]?.display_name || t.user_id.slice(0, 8);
        const positive = Number(t.amount) > 0;
        return (
          <div key={t.id} className="px-5 py-3 flex items-center gap-3">
            <div className={`grid h-9 w-9 place-items-center rounded-full ${positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{name} <span className="text-slate-400 font-normal">· {t.type}</span></div>
              <div className="text-xs text-slate-500 truncate">{t.reason || "—"} · {new Date(t.created_at).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}>{positive ? "+" : ""}{fmt(Number(t.amount))}</div>
              <div className="text-[11px] text-slate-400">bal {fmt(Number(t.balance_after))}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ManualAdjustPanel({ wallets, profiles, selectedUser, onSelectUser, onDone }: {
  wallets: WalletRow[]; profiles: Record<string, ProfileEmail>; selectedUser: string | null;
  onSelectUser: (uid: string | null) => void; onDone: () => void;
}) {
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selected = wallets.find(w => w.user_id === selectedUser);
  const selectedName = selected ? (profiles[selected.user_id]?.display_name || "Customer") : null;
  const QUICK = [100, 200, 500, 1000, 2000];

  const apply = async () => {
    if (!selectedUser) { toast.error("Select a customer"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a positive amount"); return; }
    const reason = note.trim() || (direction === "credit" ? "Manual credit" : "Manual debit");
    const signed = direction === "credit" ? amt : -amt;
    setBusy(true);
    const { error } = await supabase.rpc("admin_adjust_wallet" as any, { _user_id: selectedUser, _amount: signed, _reason: reason });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${direction === "credit" ? "Credited" : "Debited"} ${fmt(amt)}`);
    setAmount(""); setNote("");
    onDone();
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 lg:sticky lg:top-4 self-start">
      <div className="flex items-center gap-2">
        <div className="h-7 w-1 rounded bg-gradient-to-b from-violet-500 to-fuchsia-600" />
        <Wallet className="h-5 w-5 text-violet-600" />
        <h2 className="text-xl font-extrabold text-slate-900">Manual Wallet Adjust</h2>
      </div>

      {/* Selector */}
      <div className="mt-4">
        <button onClick={() => setPickerOpen(o => !o)} className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-left hover:bg-slate-100">
          {selectedName ? (
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-violet-100 text-violet-600 text-xs font-semibold">{initials(selectedName, selectedUser!)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate">{selectedName}</div>
                <div className="text-[11px] text-slate-500">Balance {fmt(Number(selected?.balance || 0))}</div>
              </div>
            </div>
          ) : <span className="text-slate-500">Select a customer from the list</span>}
        </button>
        {pickerOpen && (
          <div className="mt-2 rounded-xl border border-slate-200 max-h-56 overflow-y-auto bg-white">
            {wallets.slice(0, 100).map(w => {
              const name = profiles[w.user_id]?.display_name || "Customer";
              return (
                <button key={w.user_id} onClick={() => { onSelectUser(w.user_id); setPickerOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-violet-600 text-[11px] font-semibold">{initials(name, w.user_id)}</div>
                  <div className="flex-1 min-w-0 text-xs truncate">{name}</div>
                  <div className="text-xs font-semibold text-violet-700">{fmt(Number(w.balance))}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Direction toggle */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setDirection("credit")}
          className={`h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition ${
            direction === "credit"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        ><Plus className="h-4 w-4" /> Credit</button>
        <button
          onClick={() => setDirection("debit")}
          className={`h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition ${
            direction === "debit"
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        ><Minus className="h-4 w-4" /> Debit</button>
      </div>

      {/* Amount */}
      <label className="block mt-4">
        <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Amount (৳)</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 500"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK.map(v => (
          <button key={v} onClick={() => setAmount(String(v))} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50">৳{v}</button>
        ))}
      </div>

      {/* Note */}
      <label className="block mt-4">
        <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason…"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </label>

      <button
        onClick={apply}
        disabled={busy || !selectedUser || !amount}
        className={`mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition ${
          direction === "credit"
            ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95"
            : "bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-95"
        } disabled:opacity-50`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (direction === "credit" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />)}
        {direction === "credit" ? "Credit Wallet" : "Debit Wallet"}
      </button>
    </div>
  );
}
