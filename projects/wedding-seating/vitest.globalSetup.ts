import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

export default function setup() {
  const testDb = resolve(process.cwd(), "prisma/test.db");
  if (existsSync(testDb)) rmSync(testDb);
  if (existsSync(testDb + "-journal")) rmSync(testDb + "-journal");
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
