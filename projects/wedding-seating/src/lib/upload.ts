import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/server";

function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
}

/**
 * Uploads a room/floor-plan image to Supabase Storage and returns the object
 * path (e.g. "<floorPlanId>/<safeName>") — that's what gets stored in
 * FloorPlan.image. Resolve it to a browsable URL via `imageUrlFor` (src/lib/images.ts).
 */
export async function saveUploadedImage(
  floorPlanId: string,
  filename: string,
  bytes: Uint8Array
): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${floorPlanId}/${safeName}`;
  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(objectPath, bytes, {
    upsert: true,
    contentType: contentTypeFor(safeName),
  });
  if (error) {
    throw new Error(`Failed to upload image to Supabase Storage: ${error.message}`);
  }
  return objectPath;
}
