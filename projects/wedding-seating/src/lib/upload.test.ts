import { describe, it, expect, afterAll } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { saveUploadedImage } from "./upload";

it("writes an uploaded file under data/uploads/<id> and returns its relative path", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]); // PNG magic
  const rel = await saveUploadedImage("fp123", "room.png", bytes);
  expect(rel).toBe("data/uploads/fp123/room.png");
  expect(existsSync(resolve(process.cwd(), rel))).toBe(true);
});

afterAll(() => {
  rmSync(resolve(process.cwd(), "data/uploads/fp123"), { recursive: true, force: true });
});
