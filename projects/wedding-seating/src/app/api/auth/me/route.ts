import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/actor";

/** Returns the logged-in user (email + role) for the shared admin header, or null.
 * Uses `getActor` so the `ADMIN_EMAILS` promotion is reflected (and persisted). */
export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ user: null });

  return NextResponse.json({ user: { id: actor.userId, email: actor.email }, role: actor.role });
}
