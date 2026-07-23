import { NextResponse } from "next/server";
import { listAuditEvents, type AuditScope } from "@/lib/db/audit";
import { assertAuditAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The wedding's activity log (scoped: a supplier sees only events they authored
 * or that concern their slot). Read-only — the log is written server-side. */
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
    return NextResponse.json({ events: await listAuditEvents(id, scope) });
  } catch (e) {
    return accessErrorResponse(e);
  }
}
