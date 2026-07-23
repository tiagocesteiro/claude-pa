import { NextResponse } from "next/server";
import { listRequirements, createRequirement, REQUIREMENT_KINDS, type RequirementScope, type RequirementKind } from "@/lib/db/requirements";
import { getWeddingRole, canConfirmRequirement } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { AccessError } from "@/lib/auth/access";
import { recordEvent } from "@/lib/db/audit";

export const runtime = "nodejs";

/** The interactions ledger of a wedding. Any participant may read (scoped: a
 * supplier sees only their slice); any participant may raise a requirement. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    const wr = await getWeddingRole(actor, id);
    if (!wr) throw new AccessError(404, "Wedding not found.");
    const scope: RequirementScope =
      wr.role === "supplier"
        ? { kind: "supplier", supplierId: wr.supplierId ?? null, profileId: actor.userId }
        : { kind: "all" };
    const requirements = (await listRequirements(id, scope)).map((r) => ({
      ...r,
      // A confirmation handshake only applies to "pedidos" (requests), never dúvidas.
      canAgree: r.kind === "request" && r.status === "open" && canConfirmRequirement(wr, actor.userId, r),
    }));
    return NextResponse.json({ requirements });
  } catch (e) {
    return accessErrorResponse(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    const wr = await getWeddingRole(actor, id);
    if (!wr) throw new AccessError(404, "Wedding not found.");
    const b = await req.json().catch(() => ({}));
    const title = typeof b?.title === "string" && b.title.trim() ? b.title.trim() : null;
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const kind: RequirementKind = REQUIREMENT_KINDS.includes(b?.kind) ? b.kind : "request";

    let toRole = typeof b?.toRole === "string" ? b.toRole : null;
    const toSupplierId = typeof b?.toSupplierId === "string" && b.toSupplierId ? b.toSupplierId : null;
    // A supplier's need/question defaults to being addressed to the venue.
    if (wr.role === "supplier" && !toRole && !toSupplierId) toRole = "venue";

    // Optional structured fields — coerce numbers, keep only what's provided.
    const rawData = (b?.data ?? {}) as Record<string, unknown>;
    const data: { tables?: number; linearMeters?: number; time?: string } = {};
    if (Number.isFinite(Number(rawData.tables)) && rawData.tables !== "" && rawData.tables != null) data.tables = Number(rawData.tables);
    if (Number.isFinite(Number(rawData.linearMeters)) && rawData.linearMeters !== "" && rawData.linearMeters != null) data.linearMeters = Number(rawData.linearMeters);
    if (typeof rawData.time === "string" && rawData.time.trim()) data.time = rawData.time.trim();

    const requirement = await createRequirement(id, {
      title,
      kind,
      fromRole: wr.role,
      fromProfileId: actor.userId,
      toRole,
      toSupplierId,
      momentId: typeof b?.momentId === "string" && b.momentId ? b.momentId : null,
      serviceId: typeof b?.serviceId === "string" && b.serviceId ? b.serviceId : null,
      detail: typeof b?.detail === "string" && b.detail.trim() ? b.detail.trim() : null,
      data: Object.keys(data).length > 0 ? data : null,
    });
    await recordEvent({
      weddingId: id,
      actor,
      action: "requirement.created",
      entityType: "requirement",
      entityId: requirement.id,
      summary: `${kind === "question" ? "Colocou a dúvida" : "Criou o pedido"} «${title}»${requirement.detail ? `: ${requirement.detail}` : ""}`,
      supplierId: toSupplierId ?? (wr.role === "supplier" ? wr.supplierId ?? null : null),
    });
    return NextResponse.json({ requirement }, { status: 201 });
  } catch (e) {
    return accessErrorResponse(e);
  }
}
