import { NextResponse } from "next/server";
import { getRequirement, updateRequirement, deleteRequirement, REQUIREMENT_STATUSES, type RequirementStatus } from "@/lib/db/requirements";
import { assertRequirementAccess, canConfirmRequirement, AccessError, type WeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent, diff } from "@/lib/db/audit";
import { ROLE_LABELS } from "@/lib/labels";

export const runtime = "nodejs";

const STATUS_LABELS: Record<string, string> = { open: "Aberto", agreed: "Acordado", done: "Feito" };

export async function PATCH(req: Request, { params }: { params: Promise<{ requirementId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { requirementId } = await params;
  let wr: WeddingRole;
  try {
    wr = await assertRequirementAccess(actor, requirementId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const before = await getRequirement(requirementId);
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });
  const supplierTag = before.toSupplierId ?? (wr.role === "supplier" ? wr.supplierId ?? null : null);

  const b = await req.json().catch(() => ({}));
  const fields: Parameters<typeof updateRequirement>[1] = {};
  if (typeof b?.title === "string" && b.title.trim()) fields.title = b.title.trim();
  if ("detail" in b) fields.detail = typeof b.detail === "string" && b.detail.trim() ? b.detail.trim() : null;
  if ("toRole" in b) fields.toRole = typeof b.toRole === "string" && b.toRole ? b.toRole : null;
  if ("toSupplierId" in b) fields.toSupplierId = typeof b.toSupplierId === "string" && b.toSupplierId ? b.toSupplierId : null;
  if ("momentId" in b) fields.momentId = typeof b.momentId === "string" && b.momentId ? b.momentId : null;
  if ("serviceId" in b) fields.serviceId = typeof b.serviceId === "string" && b.serviceId ? b.serviceId : null;

  const requestedStatus = REQUIREMENT_STATUSES.includes(b?.status) ? (b.status as RequirementStatus) : undefined;

  // Does this edit change the requirement's CONTENT (title/detail)? Editing an
  // already-agreed requirement auto-reopens it — an agreement can't be silently
  // altered.
  const contentEdited =
    (fields.title !== undefined && fields.title !== before.title) ||
    (fields.detail !== undefined && fields.detail !== before.detail);
  const autoReopen = contentEdited && before.status === "agreed" && requestedStatus === undefined;

  // Handshake: only the COUNTERPART may confirm ("agreed"). The raiser can't.
  if (requestedStatus === "agreed") {
    if (!canConfirmRequirement(wr, actor.userId, before)) {
      return accessErrorResponse(new AccessError(403, "Este pedido tem de ser confirmado pela outra parte."));
    }
    fields.status = "agreed";
    fields.agreedByProfileId = actor.userId;
    fields.agreedByRole = wr.role;
    fields.agreedAt = new Date();
  } else if (requestedStatus !== undefined) {
    // Moving to open/done. Clear the agreement when reopening; keep it on "done".
    fields.status = requestedStatus;
    if (requestedStatus === "open") {
      fields.agreedByProfileId = null;
      fields.agreedByRole = null;
      fields.agreedAt = null;
    }
  }
  if (autoReopen) {
    fields.status = "open";
    fields.agreedByProfileId = null;
    fields.agreedByRole = null;
    fields.agreedAt = null;
  }

  const requirement = await updateRequirement(requirementId, fields);

  // Audit.
  const changes = diff(
    { title: before.title, detail: before.detail, status: before.status },
    { title: requirement.title, detail: requirement.detail, status: requirement.status }
  );
  if (Object.keys(changes).length > 0) {
    const statusChanged = before.status !== requirement.status;
    let action = "requirement.updated";
    let summary = `Editou o pedido «${requirement.title}»`;
    if (autoReopen) {
      action = "requirement.reopened";
      summary = `Reabriu «${requirement.title}» ao editá-lo depois de acordado`;
    } else if (statusChanged && requirement.status === "agreed") {
      action = "requirement.agreed";
      summary = `Confirmou o acordo de «${requirement.title}» (${ROLE_LABELS[wr.role] ?? wr.role})`;
    } else if (statusChanged) {
      action = "requirement.status_changed";
      summary = `Marcou «${before.title}» como ${STATUS_LABELS[requirement.status] ?? requirement.status}`;
    }
    await recordEvent({
      weddingId: before.weddingId,
      actor,
      action,
      entityType: "requirement",
      entityId: requirement.id,
      summary,
      supplierId: supplierTag,
      changes,
    });
  }
  return NextResponse.json({ requirement });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ requirementId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { requirementId } = await params;
  let supplierActor = false;
  let wrSupplierId: string | null = null;
  try {
    const wr = await assertRequirementAccess(actor, requirementId, "write");
    supplierActor = wr.role === "supplier";
    wrSupplierId = wr.supplierId ?? null;
  } catch (e) {
    return accessErrorResponse(e);
  }
  const before = await getRequirement(requirementId);
  await deleteRequirement(requirementId);
  if (before) {
    await recordEvent({
      weddingId: before.weddingId,
      actor,
      action: "requirement.deleted",
      entityType: "requirement",
      entityId: requirementId,
      summary: `Removeu o pedido «${before.title}»`,
      supplierId: before.toSupplierId ?? (supplierActor ? wrSupplierId : null),
    });
  }
  return NextResponse.json({ ok: true });
}
