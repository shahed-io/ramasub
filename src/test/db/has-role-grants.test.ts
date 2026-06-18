import { describe, it, expect } from "vitest";
import { Client } from "pg";

const CONN =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

const FUNC_SIG = "public.has_role(uuid, app_role)";
const REQUIRED_ROLES = ["authenticated", "anon"] as const;

// Skip locally when no DB URL is configured; CI must set SUPABASE_DB_URL
// to actually enforce the grants.
const d = CONN ? describe : describe.skip;

d("migration: GRANT EXECUTE on public.has_role(uuid, app_role)", () => {
  it("exists and is executable by authenticated + anon", async () => {
    const client = new Client({
      connectionString: CONN!,
      ssl: CONN!.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
    await client.connect();
    try {
      const { rows: fnRows } = await client.query(
        `SELECT to_regprocedure($1) AS oid`,
        [FUNC_SIG],
      );
      expect(
        fnRows[0]?.oid,
        `function ${FUNC_SIG} must exist`,
      ).toBeTruthy();

      for (const role of REQUIRED_ROLES) {
        const { rows } = await client.query(
          `SELECT has_function_privilege($1, $2, 'EXECUTE') AS can_exec`,
          [role, FUNC_SIG],
        );
        expect(
          rows[0]?.can_exec,
          `role "${role}" must have EXECUTE on ${FUNC_SIG} — add: GRANT EXECUTE ON FUNCTION ${FUNC_SIG} TO ${role};`,
        ).toBe(true);
      }
    } finally {
      await client.end();
    }
  }, 30_000);
});
