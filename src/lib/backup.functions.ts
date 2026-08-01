import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BACKUP_BUCKETS, type BackupPayload } from "@/lib/backup-tables";
import {
  assertAdmin,
  countTables,
  dumpTables,
  listBucketObjects,
  resolveTables,
  restoreTables,
  uploadBucketObject,
  type StorageObject,
} from "@/lib/backup.server";

export { BACKUP_TABLES, BACKUP_TABLE_ORDER, BACKUP_BUCKETS } from "@/lib/backup-tables";
export type { BackupPayload } from "@/lib/backup-tables";

/** Row counts only — used to render stats fast without dumping data. */
export const getBackupCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ counts: Record<string, number>; total: number }> => {
    await assertAdmin(context.userId);
    const counts = await countTables();
    return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  });

/** Dump all (or selected) tables. Called in parallel batches for progress %. */
export const createBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tables: z.array(z.string()).optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<{
    json: string;
    meta: { created_at: string; total_rows: number; counts: Record<string, number> };
  }> => {
    await assertAdmin(context.userId);
    const wanted = resolveTables(data?.tables);
    const { tables, counts } = await dumpTables(wanted);
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

/** Every file in the backup buckets with a 1h signed download URL. */
export const listBackupFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ files: StorageObject[] }> => {
    await assertAdmin(context.userId);
    const per = await Promise.all(BACKUP_BUCKETS.map((b) => listBucketObjects(b)));
    return { files: per.flat() };
  });

/** Restore one storage file from a Complete Backup ZIP (duplicate-safe). */
export const restoreBackupFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        bucket: z.enum(["admin-uploads", "payment-screenshots"]),
        path: z.string().min(1).max(500),
        base64: z.string().min(1),
        contentType: z.string().max(120).optional(),
        overwrite: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return uploadBucketObject(
      data.bucket,
      data.path,
      data.base64,
      data.contentType,
      data.overwrite ?? false,
    );
  });

export type RestoreResult = {
  ok: boolean;
  restored_at: string;
  results: Record<string, { restored: number; skipped?: number; error?: string }>;
};

/** Smart restore: skip (default), merge or replace. */
export const restoreBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        payloadJson: z.string().min(2),
        mode: z.enum(["skip", "merge", "replace"]).default("skip"),
        selectedTables: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<RestoreResult> => {
    await assertAdmin(context.userId);
    const parsed = z
      .object({
        tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
      })
      .passthrough()
      .parse(JSON.parse(data.payloadJson));
    const results = await restoreTables(parsed.tables, data.mode, data.selectedTables);
    return { ok: true, results, restored_at: new Date().toISOString() };
  });
