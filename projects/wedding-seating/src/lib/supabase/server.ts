import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service-role key — full access to Storage
// (and, later, any table we choose to bypass RLS for). NEVER import this from a
// client component and NEVER expose SUPABASE_SERVICE_ROLE_KEY via NEXT_PUBLIC_*.
function buildClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for Supabase admin client."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin?: ReturnType<typeof buildClient>;
};

export const supabaseAdmin = globalForSupabase.supabaseAdmin ?? buildClient();

if (process.env.NODE_ENV !== "production") globalForSupabase.supabaseAdmin = supabaseAdmin;

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "floorplans";
