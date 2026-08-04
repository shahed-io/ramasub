import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Redirect = {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  hits: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function normalize(p: string): string {
  let v = (p || "").trim();
  if (!v) return v;
  if (!v.startsWith("/") && !/^https?:\/\//i.test(v)) v = "/" + v;
  // strip trailing slash except root
  if (v.length > 1 && v.endsWith("/")) v = v.slice(0, -1);
  return v;
}

async function adminGuard(context: { supabase: { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
  const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");
  await assertAdminMfaGrant(context.userId);
}


export const listRedirects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Redirect[]> => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("redirects" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Redirect[];
  });

export const upsertRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string;
    from_path: string;
    to_path: string;
    status_code?: number;
    is_active?: boolean;
    notes?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    await adminGuard(context as never);
    const from_path = normalize(data.from_path);
    const to_path = normalize(data.to_path);
    if (!from_path || !to_path) throw new Error("from_path and to_path required");
    if (from_path === to_path) throw new Error("from_path and to_path cannot be identical");
    const status_code = [301, 302, 307, 308].includes(data.status_code ?? 301) ? (data.status_code ?? 301) : 301;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      from_path,
      to_path,
      status_code,
      is_active: data.is_active ?? true,
      notes: data.notes?.trim() || null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("redirects" as never).update(payload as never).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("redirects" as never).insert(payload as never);
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await adminGuard(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("redirects" as never).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
