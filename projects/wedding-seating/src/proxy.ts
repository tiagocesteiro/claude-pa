import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy (Next.js 16's renamed Middleware). Two concerns, in order:
 *
 * 1. Refresh the Supabase session cookie (keeps logged-in users signed in).
 * 2. ENFORCE auth (Fase D1): unauthenticated requests to protected paths are
 *    redirected to /login (pages) or rejected with 401 JSON (API).
 *
 * The interim SITE_PASSWORD Basic-auth gate was removed here — real auth
 * replaces it.
 *
 * Coarse gating only. Per-tenant data scoping (owner filters on reads / leaf
 * mutations) is Fase D2, not here.
 */

/** Paths reachable without a session. */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true; // landing / marketing page
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/registar" ||
    pathname.startsWith("/registar/") ||
    // Auth callbacks (e.g. email confirmation) — never gate these.
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    // Auth API (login/signup/logout/me) MUST stay open, or a logged-out user
    // could never sign in.
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/")
  );
}

export async function proxy(req: NextRequest) {
  // 1. Refresh session + resolve the current user (cookies written onto `response`).
  const { response, user } = await updateSession(req);

  const { pathname } = req.nextUrl;

  // Public paths and authenticated requests pass straight through.
  if (isPublicPath(pathname) || user) return response;

  // 2. Unauthenticated request to a protected path.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Page → redirect to login, remembering where they wanted to go.
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
  const redirect = NextResponse.redirect(loginUrl);
  // Carry over any refreshed auth cookies so the session isn't dropped.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  // Everything except Next's static assets (which carry no data).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
