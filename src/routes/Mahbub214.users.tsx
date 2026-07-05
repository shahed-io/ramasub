import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Shield, ShieldOff, User } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminStatCard, AdminStatGrid, AdminGlassCard } from "@/components/admin/AdminStatCard";

export const Route = createFileRoute("/admin/users")({
 component: AdminUsers,
});

type Row = {
 id: string;
 display_name: string | null;
 phone: string | null;
 created_at: string;
 is_admin: boolean;
};

function AdminUsers() {
 const [rows, setRows] = useState<Row[]>([]);
 const [loading, setLoading] = useState(true);
 const [q, setQ] = useState("");

 const load = useCallback(async () => {
 setLoading(true);
 const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
 supabase.from("profiles").select("id,display_name,phone,created_at").order("created_at", { ascending: false }),
 supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
 ]);
 if (e1) toast.error(e1.message);
 if (e2) toast.error(e2.message);
 const adminSet = new Set((roles ?? []).map((r) => r.user_id));
 setRows((profiles ?? []).map((p) => ({ ...p, is_admin: adminSet.has(p.id) })));
 setLoading(false);
 }, []);

 useEffect(() => { load(); }, [load]);

 const toggleAdmin = async (row: Row) => {
 if (row.is_admin) {
 if (!confirm(`Revoke admin from ${row.display_name || row.id.slice(0, 8)}?`)) return;
 const { error } = await supabase.from("user_roles").delete().eq("user_id", row.id).eq("role", "admin");
 if (error) return toast.error(error.message);
 toast.success("Admin revoked");
 } else {
 const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: "admin" });
 if (error) return toast.error(error.message);
 toast.success("Admin granted");
 }
 load();
 };

 const filtered = rows.filter((r) => {
 if (!q) return true;
 const s = q.toLowerCase();
 return (r.display_name || "").toLowerCase().includes(s) || (r.phone || "").includes(s) || r.id.includes(s);
 });

 const adminCount = rows.filter(r => r.is_admin).length;
 const now = Date.now();
 const newThisMonth = rows.filter(r => now - new Date(r.created_at).getTime() < 30 * 86400000).length;
 const newThisWeek = rows.filter(r => now - new Date(r.created_at).getTime() < 7 * 86400000).length;

 return (
 <div className="space-y-5 animate-fade-in">
 <div className="flex items-end justify-between flex-wrap gap-3">
 <div>
 <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Users</h1>
 <p className="text-sm text-slate-500 mt-1">Manage customers and admin permissions.</p>
 </div>
 <SearchBar
 value={q}
 onChange={setQ}
 placeholder="Search name, phone, id…"
 size="md"
 className="w-72 max-w-full"
 />
 </div>

 <AdminStatGrid>
 <AdminStatCard label="Total Users" value={rows.length.toLocaleString("en-IN")} delta={12} tone="indigo" loading={loading} />
 <AdminStatCard label="New This Month" value={newThisMonth.toLocaleString("en-IN")} delta={36} tone="emerald" loading={loading} />
 <AdminStatCard label="New This Week" value={newThisWeek.toLocaleString("en-IN")} delta={8} tone="sky" loading={loading} />
 <AdminStatCard label="Admins" value={adminCount.toLocaleString("en-IN")} tone="violet" loading={loading} />
 </AdminStatGrid>

 <AdminGlassCard className="overflow-hidden p-0">
 {loading ? null : filtered.length === 0 ? (
 <div className="p-10 text-center text-slate-500">No users found.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
 <tr>
 <th className="text-left px-4 py-3">User</th>
 <th className="text-left px-4 py-3">Phone</th>
 <th className="text-left px-4 py-3">Joined</th>
 <th className="text-left px-4 py-3">Role</th>
 <th className="text-right px-4 py-3">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filtered.map((r) => (
 <tr key={r.id} className="hover:bg-white/60">
 <td className="px-4 py-3">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-full bg-slate-100 ring-1 ring-slate-200 grid place-items-center text-xs font-bold text-slate-600">
 {(r.display_name || "U").slice(0, 1).toUpperCase()}
 </div>
 <div>
 <div className="font-semibold text-slate-900">{r.display_name || <span className="text-slate-500">Unnamed</span>}</div>
 <div className="text-[10px] text-slate-500 font-mono">{r.id.slice(0, 8)}…</div>
 </div>
 </div>
 </td>
 <td className="px-4 py-3 text-slate-700">{r.phone || "—"}</td>
 <td className="px-4 py-3 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
 <td className="px-4 py-3">
 {r.is_admin ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-slate-50 text-slate-700 ring-slate-200">
 <Shield className="w-3 h-3" /> Admin
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-slate-50 text-slate-600 ring-slate-200">
 <User className="w-3 h-3" /> Customer
 </span>
 )}
 </td>
 <td className="px-4 py-3 text-right">
 <button
 onClick={() => toggleAdmin(r)}
 className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] font-bold ring-1 transition ${
 r.is_admin
 ? "ring-slate-200 text-slate-600 hover:bg-slate-50"
 : "ring-slate-200 text-slate-700 hover:bg-slate-50"
 }`}
 >
 {r.is_admin ? <><ShieldOff className="w-3.5 h-3.5" /> Revoke admin</> : <><Shield className="w-3.5 h-3.5" /> Make admin</>}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </AdminGlassCard>
 </div>
 );
}
