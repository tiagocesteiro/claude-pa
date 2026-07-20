import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

export interface UpdateSessionResult {
  /** The response carrying any refreshed auth cookies — return it (or copy its
   * cookies onto a redirect) so the session isn't silently dropped. */
  response: NextResponse;
  /** The logged-in user for this request, or null. Used by the proxy to gate. */
  user: User | null;
}

/**
 * Refreshes the Supabase auth session cookie on every request that reaches the
 * proxy AND returns the resolved user so the proxy can enforce auth (Fase D1).
 *
 * This function itself never redirects — it only refreshes cookies and reports
 * the user. The proxy decides what to do with an unauthenticated request, and
 * must copy `response`'s cookies onto any redirect it returns.
 *
 * Pattern follows @supabase/ssr's documented Next.js middleware recipe.
 */
export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // No Supabase env configured (e.g. some local setups) — skip refresh, don't break the app.
    return { response: supabaseResponse, user: null };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not add code between createServerClient and getUser() — this call refreshes
  // the token and must run for every request that flows through the proxy.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
}
