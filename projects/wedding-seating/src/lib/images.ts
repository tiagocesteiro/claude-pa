// Bucket name isn't a secret, but only NEXT_PUBLIC_* env vars survive into the
// client bundle — so this is a literal default (matching SUPABASE_STORAGE_BUCKET
// in .env) rather than a read of the server-only env var.
const DEFAULT_BUCKET = "floorplans";

// Resolves a stored FloorPlan.image value (a Supabase Storage object path, e.g.
// "<floorPlanId>/<filename>") to a public URL the browser can load directly.
// Safe to call from client components — only reads NEXT_PUBLIC_* env vars.
export function imageUrlFor(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  if (/^https?:\/\//.test(image)) return image;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return undefined;

  const objectPath = image.replace(/^data\/uploads\//, "").replace(/\\/g, "/");
  return `${base}/storage/v1/object/public/${DEFAULT_BUCKET}/${objectPath}`;
}
