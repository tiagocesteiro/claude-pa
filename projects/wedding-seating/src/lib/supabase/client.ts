"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client (anon key only). Safe to import from client
// components — never put the service-role key here.
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars for Supabase browser client."
    );
  }
  return createBrowserClient(url, anonKey);
}
