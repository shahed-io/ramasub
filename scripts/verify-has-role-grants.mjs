#!/usr/bin/env node
/**
 * CI verification: ensures GRANT EXECUTE on public.has_role(uuid, app_role)
 * exists for BOTH `authenticated` and `anon` Postgres roles.
 *
 * Exits non-zero (failing CI) if either grant is missing or the function
 * itself is absent. Requires SUPABASE_DB_URL (or DATABASE_URL) env var.
 *
 * Usage:
 *   SUPABASE_DB_URL=postgres://... node scripts/verify-has-role-grants.mjs
 */
import pg from "pg";

const CONN =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!CONN) {
  console.error(
    "[verify-has-role-grants] FAIL: SUPABASE_DB_URL (or DATABASE_URL) is not set.",
  );
  process.exit(2);
}

const FUNC_SIG = "public.has_role(uuid, app_role)";
const REQUIRED_ROLES = ["authenticated", "anon"];

const client = new pg.Client({
  connectionString: CONN,
  ssl: CONN.includes("localhost") ? false : { rejectUnauthorized: false },
});

try {
  await client.connect();

  // 1. Function exists? (resolve via regprocedure cast)
  const { rows: fnRows } = await client.query(
    `SELECT to_regprocedure($1) AS oid`,
    [FUNC_SIG],
  );
  if (!fnRows[0]?.oid) {
    console.error(
      `[verify-has-role-grants] FAIL: function ${FUNC_SIG} does not exist.`,
    );
    process.exit(1);
  }

  // 2. EXECUTE privilege for each required role?
  const failures = [];
  for (const role of REQUIRED_ROLES) {
    const { rows } = await client.query(
      `SELECT has_function_privilege($1, $2, 'EXECUTE') AS can_exec`,
      [role, FUNC_SIG],
    );
    const ok = rows[0]?.can_exec === true;
    console.log(
      `[verify-has-role-grants] ${role.padEnd(13)} EXECUTE on ${FUNC_SIG} => ${ok ? "OK" : "MISSING"}`,
    );
    if (!ok) failures.push(role);
  }

  if (failures.length > 0) {
    console.error(
      `\n[verify-has-role-grants] FAIL: missing GRANT EXECUTE on ${FUNC_SIG} for: ${failures.join(", ")}`,
    );
    console.error(
      `Fix with a migration:\n  GRANT EXECUTE ON FUNCTION ${FUNC_SIG} TO ${failures.join(", ")};`,
    );
    process.exit(1);
  }

  console.log(
    `\n[verify-has-role-grants] PASS: ${FUNC_SIG} is executable by ${REQUIRED_ROLES.join(", ")}.`,
  );
  process.exit(0);
} catch (err) {
  console.error("[verify-has-role-grants] ERROR:", err);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
