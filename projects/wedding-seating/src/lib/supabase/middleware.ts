import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookie on every request that reaches the
 * proxy. This does NOT gate/redirect anything (that's Fase D) — it only keeps
 * the session alive so users aren't silently logged out. Called from
 * `src/proxy.ts` after the interim Basic-auth gate.
 *
 * Pattern follows @supabase/ssr's documented Next.js middleware recipe.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // No Supabase env configured (e.g. some local setups) — skip refresh, don't break the app.
    return supabaseResponse;
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
  await supabase.auth.getUser();

  return supabaseResponse;
}
