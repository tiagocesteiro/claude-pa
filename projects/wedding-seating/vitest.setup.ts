import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// Use a dedicated throwaway SQLite file for tests.
const TEST_DB = resolve(process.cwd(), "prisma/test.db");
process.env.DATABASE_URL = `file:./test.db`;

if (existsSync(TEST_DB)) rmSync(TEST_DB);

// Apply the current schema to the empty test DB (no migration history needed).
execSync("npx prisma db push --skip-generate --accept-data-loss", {
  stdio: "ignore",
  env: { ...process.env, DATABASE_URL: "file:./test.db" },
});
