import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { GET } from "./route";

const testDir = resolve(process.cwd(), "data/uploads/testfp_sec");
const testFile = resolve(testDir, "ok.txt");

beforeAll(async () => {
  await mkdir(testDir, { recursive: true });
  await writeFile(testFile, "hello world");
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

it("serves a legit file inside data/uploads", async () => {
  const res = await GET(new Request("http://x/api/uploads/testfp_sec/ok.txt"), {
    params: Promise.resolve({ path: ["testfp_sec", "ok.txt"] }),
  });
  expect(res.status).toBe(200);
});

it("blocks relative path traversal outside data/uploads", async () => {
  const res = await GET(new Request("http://x/api/uploads/../../package.json"), {
    params: Promise.resolve({ path: ["..", "..", "package.json"] }),
  });
  expect(res.status).toBe(404);
});

it("blocks deep relative path traversal to system files", async () => {
  const res = await GET(new Request("http://x/api/uploads/../../../../Windows/System32/drivers/etc/hosts"), {
    params: Promise.resolve({
      path: ["..", "..", "..", "..", "Windows", "System32", "drivers", "etc", "hosts"],
    }),
  });
  expect(res.status).toBe(404);
});
