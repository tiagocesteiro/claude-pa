import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy (Next.js 16's renamed Middleware) — two concerns merged into the one
 * allowed proxy file:
 *
 * 1. INTERIM shared-password gate (HTTP Basic Auth) — kept as-is from before
 *    Fase C. Active ONLY when `SITE_PASSWORD` is set, so local dev stays open.
 *    Remove once Fase D's real route protection is in place.
 * 2. Supabase session refresh (Fase C) — keeps the auth cookie alive so
 *    logged-in users aren't silently signed out. This does NOT redirect or
 *    gate anything by auth state (that's Fase D) — logged-out users can still
 *    reach every page for now.
 */
export async function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (password) {
    const auth = req.headers.get("authorization");
    let authorized = false;
    if (auth?.startsWith("Basic ")) {
      try {
        const decoded = atob(auth.slice("Basic ".length));
        const sep = decoded.indexOf(":");
        const supplied = sep >= 0 ? decoded.slice(sep + 1) : "";
        // Any username is accepted; only the password matters for this interim gate.
        authorized = supplied === password;
      } catch {
        // malformed header → not authorized, falls through to the 401 below
      }
    }
    if (!authorized) {
      return new NextResponse("Acesso privado.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Wedding Seating (privado)"' },
      });
    }
  }

  // Basic-auth gate passed (or not configured) — refresh the Supabase session.
  return updateSession(req);
}

export const config = {
  // Everything except Next's static assets (which carry no data).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
