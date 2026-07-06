import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const UPLOAD_ROOT = "data/uploads";

export async function saveUploadedImage(
  floorPlanId: string,
  filename: string,
  bytes: Uint8Array
): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const relDir = join(UPLOAD_ROOT, floorPlanId);
  const absDir = resolve(process.cwd(), relDir);
  await mkdir(absDir, { recursive: true });
  await writeFile(resolve(absDir, safeName), bytes);
  return join(relDir, safeName).split("\\").join("/");
}
