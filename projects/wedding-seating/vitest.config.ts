import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { resolve } from "node:path";

// Tests run against an ISOLATED Postgres `test` schema on the same database
// (Supabase), so they never touch the app's `public` data. The connection URL is
// read from `.env` at load time (DIRECT_URL = session pooler) and `schema=test`
// is appended to route all test tables/queries into that schema. No secret is
// committed here — it's read from the local `.env` at runtime.
const env = loadEnv("test", process.cwd(), "");
const base = env.DIRECT_URL || env.DATABASE_URL || "";
const testUrl = base ? base + (base.includes("?") ? "&" : "?") + "schema=test" : "";
// Base URL (default/public search-path) used to CREATE the schema in globalSetup.
process.env.TEST_DATABASE_URL = testUrl;
process.env.TEST_BASE_URL = base;

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./vitest.globalSetup.ts"],
    fileParallelism: false,
    // Every test worker talks to the isolated `test` schema.
    env: { DATABASE_URL: testUrl },
  },
});
