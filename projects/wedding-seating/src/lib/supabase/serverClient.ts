import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Per-request Supabase client for Server Components / Route Handlers / Server
// Actions. Uses the ANON key + the request's cookies — this is what carries the
// logged-in user's session, unlike `src/lib/supabase/server.ts` (service-role
// admin client, used only for Storage and never for auth).
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars for Supabase server client."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // `set` was called from a Server Component (no response to attach cookies to).
          // Safe to ignore because the proxy also refreshes the session on every request.
        }
      },
    },
  });
}

/** Returns the logged-in Supabase user for the current request, or null. */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
