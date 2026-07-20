import { NextResponse } from "next/server";
import { requireActor } from "@/lib/auth/guard";
import { getAdminOverview } from "@/lib/auth/access";

/**
 * Platform-admin overview — EVERY venue + wedding across all tenants. Reserved
 * to the `admin` role (granted only via the `ADMIN_EMAILS` allowlist); any other
 * authenticated actor gets 403, logged-out gets 401.
 */
export async function GET() {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  if (actor.role !== "admin") {
    return NextResponse.json(
      { error: "Acesso reservado a administradores da plataforma." },
      { status: 403 }
    );
  }
  return NextResponse.json(await getAdminOverview());
}
