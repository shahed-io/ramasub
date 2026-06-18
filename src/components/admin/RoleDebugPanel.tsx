import { useEffect, useState } from "react";
import { ShieldCheck, Copy, Check, RefreshCw, KeyRound, User, Database, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type RoleRow = { role: string; created_at: string };

type Capability = { resource: string; actions: string; requires: string };

type GrantRow = { grantee: string; signature: string; can_execute: boolean };

// Mirror of the actual RLS policies in Postgres (kept in sync manually).
const ADMIN_CAPABILITIES: Capability[] = [
  { resource: "products", actions: "view · create · update · delete", requires: "admin" },
  { resource: "orders", actions: "view all · update", requires: "admin" },
  { resource: "promotions", actions: "view · create · update · delete", requires: "admin" },
  { resource: "notifications", actions: "view all · create · update · delete", requires: "admin" },
  { resource: "support_tickets", actions: "view all · update · delete", requires: "admin" },
  { resource: "team_members", actions: "view · manage (all)", requires: "admin" },
  { resource: "user_roles", actions: "view · manage (all)", requires: "admin" },
  { resource: "accessibility_reports", actions: "view all · update · delete", requires: "admin" },
  { resource: "activity_logs", actions: "view · insert", requires: "admin" },
  { resource: "admin_records", actions: "view · create · update · delete", requires: "admin" },
  { resource: "profiles", actions: "view all", requires: "admin" },
];

const USER_CAPABILITIES: Capability[] = [
  { resource: "profiles", actions: "view own · update own", requires: "authenticated" },
  { resource: "orders", actions: "view own · create own", requires: "authenticated" },
  { resource: "notifications", actions: "view own · update own (read_status only)", requires: "authenticated" },
  { resource: "support_tickets", actions: "view own · create own", requires: "authenticated" },
  { resource: "user_roles", actions: "view own", requires: "authenticated" },
  { resource: "accessibility_reports", actions: "view own · submit", requires: "anyone" },
  { resource: "products / promotions / admin_records", actions: "view (active only)", requires: "anyone" },
];

export default function RoleDebugPanel() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [adminCheck, setAdminCheck] = useState<boolean | null>(null);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [grantsError, setGrantsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setGrantsError(null);
      try {
        const [rolesRes, hasRoleRes, grantsRes] = await Promise.all([
          supabase.from("user_roles").select("role, created_at").eq("user_id", user.id),
          supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("v_has_role_permissions").select("grantee, signature, can_execute"),
        ]);
        if (cancelled) return;
        if (rolesRes.error) throw rolesRes.error;
        if (hasRoleRes.error) throw hasRoleRes.error;
        setRoles((rolesRes.data ?? []) as RoleRow[]);
        setAdminCheck(Boolean(hasRoleRes.data));
        if (grantsRes.error) {
          setGrantsError(grantsRes.error.message);
          setGrants([]);
        } else {
          setGrants((grantsRes.data ?? []) as GrantRow[]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, tick]);

  const session = user;
  const capabilities = adminCheck ? ADMIN_CAPABILITIES : USER_CAPABILITIES;

  const debugJson = JSON.stringify(
    {
      user_id: session?.id,
      email: session?.email,
      roles: roles.map((r) => r.role),
      has_admin: adminCheck,
      auth_provider: session?.app_metadata?.provider,
      jwt_iat: session ? new Date(((session as unknown as { created_at?: string }).created_at) || 0).toISOString() : null,
      checked_at: new Date().toISOString(),
    },
    null,
    2,
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(debugJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <section
      aria-labelledby="role-debug-heading"
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="role-debug-heading" className="text-sm font-bold text-slate-900">
              Role &amp; Permissions Debug
            </h2>
            <p className="text-[11px] text-slate-500">আপনার বর্তমান অ্যাক্সেস লেভেল ও কী কী করতে পারবেন</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
            aria-label="Refresh role check"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
          <button
            type="button"
            onClick={copy}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800"
            aria-label="Copy debug JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
      </header>

      <div className="p-5 grid gap-4 lg:grid-cols-3">
        {/* Identity */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            <User className="w-3 h-3" aria-hidden="true" /> Identity
          </div>
          <dl className="space-y-2 text-[12.5px]">
            <div>
              <dt className="text-slate-500 text-[11px]">Email</dt>
              <dd className="font-mono text-slate-900 break-all">{session?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500 text-[11px]">User ID</dt>
              <dd className="font-mono text-[10.5px] text-slate-700 break-all">{session?.id ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500 text-[11px]">Provider</dt>
              <dd className="font-mono text-slate-900">{session?.app_metadata?.provider ?? "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Roles */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            <KeyRound className="w-3 h-3" aria-hidden="true" /> Roles
          </div>
          {error ? (
            <div className="text-xs text-rose-600 font-mono">{error}</div>
          ) : loading ? (
            <div className="text-xs text-slate-500">Checking…</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {roles.length === 0 ? (
                  <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-700">user (default)</span>
                ) : (
                  roles.map((r) => (
                    <span
                      key={r.role}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${
                        r.role === "admin"
                          ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {r.role}
                    </span>
                  ))
                )}
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                <span>has_role(admin):</span>
                <span className={`font-bold ${adminCheck ? "text-emerald-600" : "text-rose-600"}`}>
                  {adminCheck ? "true" : "false"}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Quick JSON snapshot */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-4 overflow-hidden">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <Database className="w-3 h-3" aria-hidden="true" /> Snapshot
          </div>
          <pre className="text-[10.5px] leading-relaxed font-mono overflow-auto max-h-44">
            {debugJson}
          </pre>
        </div>
      </div>

      {/* has_role EXECUTE grants (from v_has_role_permissions) */}
      <div className="px-5 pb-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3 h-3" aria-hidden="true" />
            has_role EXECUTE grants
          </span>
          <span className="text-slate-400 normal-case font-medium">
            Source: public.v_has_role_permissions
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {grantsError ? (
            <div className="p-3 text-xs text-rose-600 font-mono bg-rose-50">{grantsError}</div>
          ) : loading ? (
            <div className="p-3 text-xs text-slate-500">Checking grants…</div>
          ) : grants.length === 0 ? (
            <div className="p-3 text-xs text-slate-500">No rows returned.</div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="text-left font-semibold px-3 py-2">Grantee</th>
                  <th scope="col" className="text-left font-semibold px-3 py-2 hidden sm:table-cell">Signature</th>
                  <th scope="col" className="text-left font-semibold px-3 py-2">can_execute</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grants.map((g) => {
                  const required = g.grantee === "authenticated" || g.grantee === "anon";
                  const ok = g.can_execute === true;
                  return (
                    <tr key={g.grantee} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-mono text-slate-900">
                        {g.grantee}
                        {required && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                            required
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-slate-600 hidden sm:table-cell">{g.signature}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            ok
                              ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                              : required
                                ? "bg-rose-100 text-rose-700 ring-1 ring-rose-300"
                                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {ok ? <Check className="w-3 h-3" aria-hidden="true" /> : null}
                          {ok ? "true" : "false"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {!loading && !grantsError && (() => {
          const missing = ["authenticated", "anon"].filter(
            (r) => !grants.find((g) => g.grantee === r && g.can_execute),
          );
          return missing.length > 0 ? (
            <p className="mt-2 text-[11px] font-semibold text-rose-600">
              ⚠ Missing EXECUTE for: {missing.join(", ")} — RPC calls to has_role will fail.
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-emerald-700">
              ✓ authenticated &amp; anon both have EXECUTE — RPC calls will work.
            </p>
          );
        })()}
      </div>

      {/* Capabilities table */}
      <div className="px-5 pb-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span>Effective permissions ({adminCheck ? "admin" : roles.length ? "user" : "unauthenticated"})</span>
          <span className="text-slate-400 normal-case font-medium">
            Source: Postgres RLS policies
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="text-left font-semibold px-3 py-2">Resource</th>
                <th scope="col" className="text-left font-semibold px-3 py-2">Allowed actions</th>
                <th scope="col" className="text-left font-semibold px-3 py-2 hidden sm:table-cell">Required role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {capabilities.map((c) => (
                <tr key={c.resource} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-mono text-slate-900">{c.resource}</td>
                  <td className="px-3 py-2 text-slate-700">{c.actions}</td>
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                      {c.requires}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          সব চেক সার্ভার-সাইডে Postgres RLS-এ এনফোর্সড — এখানে শুধু আপনার client-side ভিউ ডিবাগের জন্য দেখানো হচ্ছে।
        </p>
      </div>
    </section>
  );
}
