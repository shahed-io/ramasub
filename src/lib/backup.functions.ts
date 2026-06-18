import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Table -> primary key for upsert on restore
export const BACKUP_TABLES: Record<string, string> = {
  products: "slug",
  admin_records: "id",
  coupons: "id",
  promotions: "id",
  orders: "id",
  notifications: "id",
  team_members: "id",
  profiles: "id",
  user_roles: "id",
  support_tickets: "id",
  product_reviews: "id",
  activity_logs: "id",
  accessibility_reports: "id",
};

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export type BackupPayload = {
  meta: {
    version: number;
    created_at: string;
    created_by: string;
    total_rows: number;
    counts: Record<string, number>;
  };
  tables: Record<string, Array<Record<string, unknown>>>;
};

export const createBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ json: string; meta: { created_at: string; total_rows: number; counts: Record<string, number> } }> => {
    await assertAdmin(context.userId);
    const tables: Record<string, Array<Record<string, unknown>>> = {};
    const counts: Record<string, number> = {};
    const admin = supabaseAdmin as unknown as {
      from: (t: string) => { select: (s: string) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> };
    };
    for (const table of Object.keys(BACKUP_TABLES)) {
      const { data, error } = await admin.from(table).select("*");
      if (error) throw new Error(`${table}: ${error.message}`);
      tables[table] = data ?? [];
      counts[table] = (data ?? []).length;
    }
    const meta = {
      version: 1,
      created_at: new Date().toISOString(),
      created_by: context.userId,
      total_rows: Object.values(counts).reduce((a, b) => a + b, 0),
      counts,
    };
    const payload: BackupPayload = { meta, tables };
    return {
      json: JSON.stringify(payload, null, 2),
      meta: { created_at: meta.created_at, total_rows: meta.total_rows, counts: meta.counts },
    };
  });

const RestoreInputSchema = z.object({
  payloadJson: z.string().min(2),
  mode: z.enum(["merge", "replace"]).default("merge"),
  selectedTables: z.array(z.string()).optional(),
});

const PayloadSchema = z.object({
  meta: z.object({ version: z.number() }).passthrough(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export type RestoreResult = {
  ok: boolean;
  restored_at: string;
  results: Record<string, { restored: number; error?: string }>;
};

export const restoreBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RestoreInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<RestoreResult> => {
    await assertAdmin(context.userId);
    const parsed = PayloadSchema.parse(JSON.parse(data.payloadJson));
    const results: Record<string, { restored: number; error?: string }> = {};
    const wanted = data.selectedTables && data.selectedTables.length
      ? data.selectedTables
      : Object.keys(parsed.tables);

    const admin = supabaseAdmin as unknown as {
      from: (t: string) => {
        delete: () => { not: (col: string, op: string, val: null) => Promise<{ error: { message: string } | null }> };
        upsert: (rows: Array<Record<string, unknown>>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
      };
    };

    for (const table of wanted) {
      const pk = BACKUP_TABLES[table];
      if (!pk) { results[table] = { restored: 0, error: "Not a backup-able table" }; continue; }
      const rows = parsed.tables[table];
      if (!rows) { results[table] = { restored: 0 }; continue; }

      if (data.mode === "replace") {
        const { error: delErr } = await admin.from(table).delete().not(pk, "is", null);
        if (delErr) { results[table] = { restored: 0, error: `clear: ${delErr.message}` }; continue; }
      }
      if (rows.length === 0) { results[table] = { restored: 0 }; continue; }

      let total = 0;
      const CHUNK = 200;
      let err: string | undefined;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const { error } = await admin.from(table).upsert(chunk, { onConflict: pk });
        if (error) { err = error.message; break; }
        total += chunk.length;
      }
      results[table] = { restored: total, error: err };
    }
    return { ok: true, results, restored_at: new Date().toISOString() };
  });

