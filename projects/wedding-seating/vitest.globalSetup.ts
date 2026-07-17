import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Provisions an ISOLATED Postgres `test` schema before the suite runs, so tests
// never touch the app's `public` data. `db push`/`migrate` don't reliably honour
// a non-public `?schema=`, so we apply the migration SQL directly with the
// connection's search_path pointed at `test`. URL comes from `.env` via
// vitest.config (never committed here).
export default function setup() {
  const baseUrl = process.env.TEST_BASE_URL;
  if (!baseUrl) {
    throw new Error("Test DB URL not set — check DIRECT_URL (or DATABASE_URL) in .env (Postgres).");
  }

  const migrationsDir = "prisma/migrations";
  const migrationSql = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((d) => readFileSync(join(migrationsDir, d, "migration.sql"), "utf8"))
    .join("\n");

  // Drop + recreate ONLY the `test` schema (safe for `public`), then apply all
  // migrations into it — one script, one connection, so search_path persists.
  const script =
    'DROP SCHEMA IF EXISTS "test" CASCADE;\nCREATE SCHEMA "test";\nSET search_path TO "test";\n' +
    migrationSql;

  execSync("npx prisma db execute --schema prisma/schema.prisma --stdin", {
    input: script,
    stdio: ["pipe", "ignore", "inherit"],
    env: { ...process.env, DATABASE_URL: baseUrl },
  });
}
