import { NextResponse } from "next/server";
import { listAuditEvents, type AuditScope } from "@/lib/db/audit";
import { getLastSeenActivity } from "@/lib/db/participants";
import { assertAuditAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The wedding's activity log (scoped: a supplier sees only events they authored
 * or that concern their slot). Read-only — the log is written server-side. Also
 * returns `lastSeenAt` (before this view) so the UI can mark which are new. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    const wr = await assertAuditAccess(actor, id);
    const scope: AuditScope =
      wr.role === "supplier"
        ? { kind: "supplier", supplierId: wr.supplierId ?? null, profileId: actor.userId }
        : { kind: "all" };
    const [events, lastSeenAt] = await Promise.all([
      listAuditEvents(id, scope),
      getLastSeenActivity(id, actor.userId),
    ]);
    return NextResponse.json({ events, lastSeenAt });
  } catch (e) {
    return accessErrorResponse(e);
  }
}
