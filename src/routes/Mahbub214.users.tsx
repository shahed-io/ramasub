import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2, Shield, ShieldOff, User, Mail, Phone, Wallet, ShoppingBag,
  Star, MessageSquare, Copy, X, Calendar, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminStatCard, AdminStatGrid, AdminGlassCard } from "@/components/admin/AdminStatCard";
import { listCustomers, type CustomerDetail } from "@/lib/customers.functions";

export const Route = createFileRoute("/Mahbub214/users")({
  component: AdminUsers,
});

const BDT = (n: number) => `৳${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");
const fmtDateShort = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—");

function copy(v: string) {
  navigator.clipboard.writeText(v).then(() => toast.success("Copied")).catch(() => toast.error("Copy failed"));
}

function AdminUsers() {
  const [rows, setRows] = useState<CustomerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "admins" | "customers" | "unverified" | "spenders">("all");
  const [selected, setSelected] = useState<CustomerDetail | null>(null);

  const load = useServerFn(listCustomers);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await load();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleAdmin = async (row: CustomerDetail) => {
    if (row.is_admin) {
      if (!confirm(`Revoke admin from ${row.display_name || row.email || row.id.slice(0, 8)}?`)) return;
      const { error } = await supabase.from("user_roles").delete().eq("user_id", row.id).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin revoked");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Admin granted");
    }
    refresh();
    if (selected?.id === row.id) setSelected({ ...row, is_admin: !row.is_admin });
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "admins" && !r.is_admin) return false;
      if (filter === "customers" && r.is_admin) return false;
      if (filter === "unverified" && r.email_confirmed) return false;
      if (filter === "spenders" && r.total_spent <= 0) return false;
      if (!s) return true;
      return (
        (r.display_name || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s) ||
        (r.phone || "").includes(s) ||
        r.id.includes(s)
      );
    });
  }, [rows, q, filter]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: rows.length,
      admins: rows.filter(r => r.is_admin).length,
      month: rows.filter(r => now - new Date(r.created_at).getTime() < 30 * 86400000).length,
      week: rows.filter(r => now - new Date(r.created_at).getTime() < 7 * 86400000).length,
      unverified: rows.filter(r => !r.email_confirmed).length,
      revenue: rows.reduce((a, r) => a + r.total_spent, 0),
    };
  }, [rows]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">Emails, orders, wallet balance and full activity — all in one place.</p>
        </div>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search name, email, phone, id…"
          size="md"
          className="w-80 max-w-full"
        />
      </div>

      <AdminStatGrid>
        <AdminStatCard label="Total Customers" value={stats.total.toLocaleString("en-IN")} tone="indigo" loading={loading} />
        <AdminStatCard label="New This Month" value={stats.month.toLocaleString("en-IN")} tone="emerald" loading={loading} />
        <AdminStatCard label="Lifetime Revenue" value={BDT(stats.revenue)} tone="sky" loading={loading} />
        <AdminStatCard label="Admins" value={stats.admins.toLocaleString("en-IN")} tone="violet" loading={loading} />
      </AdminStatGrid>

      <div className="flex flex-wrap gap-2">
        {([
          ["all", `All (${rows.length})`],
          ["customers", `Customers (${rows.length - stats.admins})`],
          ["admins", `Admins (${stats.admins})`],
          ["spenders", `Paying (${rows.filter(r => r.total_spent > 0).length})`],
          ["unverified", `Unverified (${stats.unverified})`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 h-8 rounded-full text-[12px] font-semibold ring-1 transition ${
              filter === k
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <AdminGlassCard className="overflow-hidden p-0">
        {loading ? (
          <div className="p-10 grid place-items-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">Orders</th>
                  <th className="text-left px-4 py-3">Spent</th>
                  <th className="text-left px-4 py-3">Wallet</th>
                  <th className="text-left px-4 py-3">Last seen</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-white/60 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 ring-1 ring-slate-200 grid place-items-center text-xs font-bold text-indigo-700">
                            {(r.display_name || r.email || "U").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                            {r.display_name || <span className="text-slate-500">Unnamed</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.id.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-[12px]">
                        <span className="text-slate-800 flex items-center gap-1 truncate max-w-[220px]">
                          {r.email_confirmed
                            ? <CheckCircle2 className="w-3 h-3 text-violet-500 shrink-0" />
                            : <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                          <span className="truncate">{r.email || "—"}</span>
                        </span>
                        <span className="text-slate-500">{r.phone || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.orders_count}</div>
                      <div className="text-[10px] text-slate-500">{r.orders_paid} paid</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{BDT(r.total_spent)}</td>
                    <td className="px-4 py-3 text-slate-700">{BDT(r.wallet_balance)}</td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">{fmtDateShort(r.last_sign_in_at)}</td>
                    <td className="px-4 py-3">
                      {r.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-violet-50 text-violet-700 ring-violet-200">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-slate-50 text-slate-600 ring-slate-200">
                          <User className="w-3 h-3" /> Customer
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleAdmin(r)}
                        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] font-bold ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 transition"
                      >
                        {r.is_admin ? <><ShieldOff className="w-3.5 h-3.5" /> Revoke</> : <><Shield className="w-3.5 h-3.5" /> Make admin</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminGlassCard>

      {selected && <CustomerDrawer c={selected} onClose={() => setSelected(null)} onToggleAdmin={() => toggleAdmin(selected)} />}
    </div>
  );
}

function CustomerDrawer({ c, onClose, onToggleAdmin }: { c: CustomerDetail; onClose: () => void; onToggleAdmin: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Customer details</h2>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            {c.avatar_url ? (
              <img src={c.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover ring-1 ring-slate-200" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 ring-1 ring-slate-200 grid place-items-center text-lg font-bold text-indigo-700">
                {(c.display_name || c.email || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-lg truncate">{c.display_name || "Unnamed"}</div>
              <div className="flex items-center gap-1 text-[11px]">
                {c.is_admin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                    <User className="w-3 h-3" /> Customer
                  </span>
                )}
                {c.provider && (
                  <span className="px-2 py-0.5 rounded-full font-semibold bg-sky-50 text-sky-700 ring-1 ring-sky-200 capitalize">{c.provider}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatMini icon={<ShoppingBag className="w-4 h-4" />} label="Orders" value={String(c.orders_count)} sub={`${c.orders_paid} paid`} />
            <StatMini icon={<Wallet className="w-4 h-4" />} label="Wallet" value={BDT(c.wallet_balance)} />
            <StatMini icon={<span className="font-bold">৳</span>} label="Total spent" value={BDT(c.total_spent)} />
            <StatMini icon={<Star className="w-4 h-4" />} label="Reviews" value={String(c.reviews_count)} />
          </div>

          <div className="rounded-xl ring-1 ring-slate-200 divide-y divide-slate-100 bg-white">
            <Field icon={<Mail className="w-4 h-4" />} label="Email" value={c.email || "—"} copyable badge={c.email_confirmed ? "Verified" : "Unverified"} badgeTone={c.email_confirmed ? "emerald" : "amber"} />
            <Field icon={<Phone className="w-4 h-4" />} label="Phone" value={c.phone || "—"} copyable={!!c.phone} />
            <Field icon={<User className="w-4 h-4" />} label="User ID" value={c.id} copyable mono />
            <Field icon={<Calendar className="w-4 h-4" />} label="Joined" value={fmtDate(c.created_at)} />
            <Field icon={<Clock className="w-4 h-4" />} label="Last sign-in" value={fmtDate(c.last_sign_in_at)} />
            <Field icon={<ShoppingBag className="w-4 h-4" />} label="Last order" value={fmtDate(c.last_order_at)} />
            <Field icon={<MessageSquare className="w-4 h-4" />} label="Open tickets" value={String(c.tickets_open)} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onToggleAdmin}
              className="flex-1 h-10 rounded-xl font-bold text-[13px] ring-1 ring-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              {c.is_admin ? <><ShieldOff className="w-4 h-4" /> Revoke admin</> : <><Shield className="w-4 h-4" /> Make admin</>}
            </button>
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="flex-1 h-10 rounded-xl font-bold text-[13px] bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> Email
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatMini({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl ring-1 ring-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">{icon}{label}</div>
      <div className="font-extrabold text-slate-900 mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Field({
  icon, label, value, copyable, mono, badge, badgeTone,
}: {
  icon: React.ReactNode; label: string; value: string; copyable?: boolean; mono?: boolean;
  badge?: string; badgeTone?: "emerald" | "amber" | "slate";
}) {
  const toneCls = badgeTone === "emerald"
    ? "bg-violet-50 text-violet-700 ring-violet-200"
    : badgeTone === "amber"
    ? "bg-amber-50 text-amber-700 ring-amber-200"
    : "bg-slate-50 text-slate-600 ring-slate-200";
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="text-slate-400 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
        <div className={`text-slate-800 text-[13px] truncate ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${toneCls}`}>{badge}</span>
      )}
      {copyable && (
        <button onClick={() => copy(value)} className="w-7 h-7 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500">
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
