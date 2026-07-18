// Idempotent setup: creates the Supabase Storage bucket used for floor-plan room
// images if it doesn't already exist, as a PUBLIC bucket (room images aren't
// sensitive PII — see Fase B of the professionalization plan). Reads env from
// process.env at runtime (loads .env via `node --env-file` or your shell).
//
// Usage: node --env-file=.env scripts/ensure-bucket.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "floorplans";

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) {
  console.error("Failed to list Storage buckets:", listError.message);
  process.exit(1);
}

const existing = buckets?.find((b) => b.name === bucket);
if (existing) {
  console.log(`Bucket "${bucket}" already exists (public=${existing.public}).`);
  process.exit(0);
}

const { error: createError } = await supabase.storage.createBucket(bucket, {
  public: true,
});
if (createError) {
  console.error(`Failed to create bucket "${bucket}":`, createError.message);
  process.exit(1);
}

console.log(`Bucket "${bucket}" created (public).`);
