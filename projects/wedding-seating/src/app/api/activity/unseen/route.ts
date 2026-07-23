import { NextResponse } from "next/server";
import { unseenCountsForProfile } from "@/lib/db/audit";
import { requireActor } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Per-wedding "novidades" counts for the current user, across every wedding they
 * take part in. Powers the badges on the "my weddings" lists. */
export async function GET() {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json({ counts: await unseenCountsForProfile(actor.userId) });
}
