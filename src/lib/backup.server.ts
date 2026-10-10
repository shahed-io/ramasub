import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BACKUP_TABLES, BACKUP_TABLE_ORDER } from "@/lib/backup-tables";

type AnyRow = Record<string, unknown>;

type AdminLike = {
  from: (t: string) => {
    select: (s: string, o?: { count: "exact"; head: true }) => Promise<{
      data: AnyRow[] | null;
      count: number | null;
      error: { message: string } | null;
    }>;
    delete: () => { not: (col: string, op: string, val: null) => Promise<{ error: { message: string } | null }> };
    upsert: (
      rows: AnyRow[],
      opts: { onConflict: string; ignoreDuplicates?: boolean },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

const admin = () => supabaseAdmin as unknown as AdminLike;

export async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
  const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");
  await assertAdminMfaGrant(userId);
}

export function resolveTables(requested?: string[]): string[] {
  if (!requested || requested.length === 0) return BACKUP_TABLE_ORDER;
  return requested.filter((t) => Boolean(BACKUP_TABLES[t]));
}

/** Dump the given tables in parallel. */
export async function dumpTables(tables: string[]) {
  const entries = await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await admin().from(table).select("*");
      if (error) throw new Error(`${table}: ${error.message}`);
      return [table, data ?? []] as const;
    }),
  );
  const out: Record<string, AnyRow[]> = {};
  const counts: Record<string, number> = {};
  for (const [table, rows] of entries) {
    out[table] = rows;
    counts[table] = rows.length;
  }
  return { tables: out, counts };
}

/** Fast row counts for every backup-able table (no row payload). */
export async function countTables() {
  const entries = await Promise.all(
    BACKUP_TABLE_ORDER.map(async (table) => {
      const { count, error } = await admin()
        .from(table)
        .select("*", { count: "exact", head: true });
      return [table, error ? 0 : count ?? 0] as const;
    }),
  );
  const counts: Record<string, number> = {};
  for (const [t, c] of entries) counts[t] = c;
  return counts;
}

/** Fetch the real column names of each table from the database API schema. */
async function loadTableColumns(): Promise<Record<string, Set<string>>> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out: Record<string, Set<string>> = {};
  if (!url || !key) return out;
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
    });
    const spec = (await res.json()) as any;
    const defs = spec?.definitions ?? {};
    for (const [t, d] of Object.entries<any>(defs)) {
      out[t] = new Set(Object.keys(d?.properties ?? {}));
    }
  } catch {
    /* fall through: empty map => rows rejected */
  }
  return out;
}

export type RestoreMode = "skip" | "merge" | "replace";

/**
 * Restore rows table-by-table in dependency order.
 * - skip  : insert only rows that do not exist yet (duplicate-safe, default)
 * - merge : upsert (existing rows get overwritten)
 * - replace: wipe the table first, then insert
 */
export async function restoreTables(
  payloadTables: Record<string, AnyRow[]>,
  mode: RestoreMode,
  selected?: string[],
) {
  const wanted = BACKUP_TABLE_ORDER.filter(
    (t) => payloadTables[t] && (!selected || selected.length === 0 || selected.includes(t)),
  );
  const results: Record<string, { restored: number; skipped?: number; error?: string }> = {};
  const columns = await loadTableColumns();

  for (const table of wanted) {
    const pk = BACKUP_TABLES[table];
    const allowed = columns[table];
    if (!allowed || allowed.size === 0) {
      results[table] = { restored: 0, error: "unknown table schema" };
      continue;
    }
    // SECURITY: keep only real columns of the table; drop any extra fields.
    const rows = (payloadTables[table] ?? [])
      .filter((r) => r && typeof r === "object" && !Array.isArray(r))
      .map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => allowed.has(k))));

    if (mode === "replace") {
      const { error: delErr } = await admin().from(table).delete().not(pk, "is", null);
      if (delErr) {
        results[table] = { restored: 0, error: `clear: ${delErr.message}` };
        continue;
      }
    }
    if (rows.length === 0) {
      results[table] = { restored: 0 };
      continue;
    }

    let inserted = 0;
    let err: string | undefined;
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await admin()
        .from(table)
        .upsert(chunk, { onConflict: pk, ignoreDuplicates: mode === "skip" });
      if (error) {
        err = error.message;
        break;
      }
      inserted += chunk.length;
    }
    results[table] = { restored: inserted, error: err };
  }

  return results;
}

type StorageLike = {
  storage: {
    from: (b: string) => {
      list: (
        path: string,
        opts: { limit: number; offset: number; sortBy?: { column: string; order: string } },
      ) => Promise<{ data: Array<{ name: string; id: string | null; metadata: { size?: number } | null }> | null; error: { message: string } | null }>;
      createSignedUrl: (path: string, expires: number) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
      upload: (
        path: string,
        body: ArrayBuffer | Uint8Array,
        opts: { contentType?: string; upsert: boolean },
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export type StorageObject = { bucket: string; path: string; size: number; url: string };

/** Recursively list every object in a bucket and mint signed download URLs. */
export async function listBucketObjects(bucket: string, prefix = ""): Promise<StorageObject[]> {
  const sb = supabaseAdmin as unknown as StorageLike;
  const out: StorageObject[] = [];
  const stack: string[] = [prefix];

  while (stack.length) {
    const dir = stack.pop()!;
    let offset = 0;
    // page through the folder
    for (;;) {
      const { data, error } = await sb.storage.from(bucket).list(dir, { limit: 100, offset });
      if (error || !data || data.length === 0) break;
      for (const entry of data) {
        const full = dir ? `${dir}/${entry.name}` : entry.name;
        if (entry.id === null) {
          stack.push(full); // folder
        } else {
          const { data: signed } = await sb.storage.from(bucket).createSignedUrl(full, 60 * 60);
          out.push({
            bucket,
            path: full,
            size: entry.metadata?.size ?? 0,
            url: signed?.signedUrl ?? "",
          });
        }
      }
      if (data.length < 100) break;
      offset += 100;
    }
  }
  return out;
}

export async function uploadBucketObject(
  bucket: string,
  path: string,
  base64: string,
  contentType?: string,
  overwrite = false,
) {
  const sb = supabaseAdmin as unknown as StorageLike;
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  // SECURITY: never store files that browsers would execute (HTML/SVG/JS).
  const head = new TextDecoder().decode(binary.slice(0, 512)).trimStart().toLowerCase();
  const looksMarkup = /^(<!doctype|<html|<svg|<\?xml|<script|<body|<head|<iframe)/.test(head);
  const dangerous = /(html|svg|javascript|ecmascript|xml)/i.test(contentType || "") ||
    /\.(html?|svg|xhtml|js|mjs|xml)$/i.test(path);
  if (looksMarkup || dangerous) throw new Error(`${bucket}/${path}: file type not allowed`);
  const { error } = await sb.storage.from(bucket).upload(path, binary, {
    contentType: contentType || "application/octet-stream",
    upsert: overwrite,
  });
  if (error && !/exists/i.test(error.message)) throw new Error(`${bucket}/${path}: ${error.message}`);
  return { ok: true, skipped: Boolean(error) };
}
