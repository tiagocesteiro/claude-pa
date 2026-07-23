import { NextResponse } from "next/server";
import { markActivitySeen } from "@/lib/db/participants";
import { assertAuditAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Mark this wedding's activity as seen by the current participant (resets their
 * "novidades" badge). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertAuditAccess(actor, id);
  } catch (e) {
    return accessErrorResponse(e);
  }
  await markActivitySeen(id, actor.userId);
  return NextResponse.json({ ok: true });
}
