import { NextResponse, type NextRequest } from "next/server";

/**
 * INTERIM shared-password gate (HTTP Basic Auth).
 *
 * The app has no real authentication yet (that lands in Fase C: Supabase Auth +
 * venue/couple accounts). Until then this keeps the deployed site private without
 * paying for Vercel's paid Deployment Protection, and — unlike Vercel's setting —
 * it also covers the production URL and every /api route.
 *
 * Active ONLY when `SITE_PASSWORD` is set, so local development stays open.
 * Remove this file once Fase C's real auth + tenancy (Fase D) are in place.
 *
 * Note: Next.js 16 renamed the Middleware convention to Proxy (`src/proxy.ts`).
 */
export function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next(); // no password configured → open (local dev)

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice("Basic ".length));
      const sep = decoded.indexOf(":");
      const supplied = sep >= 0 ? decoded.slice(sep + 1) : "";
      // Any username is accepted; only the password matters for this interim gate.
      if (supplied === password) return NextResponse.next();
    } catch {
      // malformed header → fall through to the 401 below
    }
  }

  return new NextResponse("Acesso privado.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Wedding Seating (privado)"' },
  });
}

export const config = {
  // Everything except Next's static assets (which carry no data).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
