import { NextResponse } from "next/server";
import { getRequirement, updateRequirement, deleteRequirement, REQUIREMENT_STATUSES, type RequirementStatus } from "@/lib/db/requirements";
import { assertRequirementAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent, diff } from "@/lib/db/audit";

export const runtime = "nodejs";

const STATUS_LABELS: Record<string, string> = { open: "Aberto", agreed: "Acordado", done: "Feito" };

export async function PATCH(req: Request, { params }: { params: Promise<{ requirementId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { requirementId } = await params;
  let wrSupplierId: string | null = null;
  let supplierActor = false;
  try {
    const wr = await assertRequirementAccess(actor, requirementId, "write");
    wrSupplierId = wr.supplierId ?? null;
    supplierActor = wr.role === "supplier";
  } catch (e) {
    return accessErrorResponse(e);
  }
  const before = await getRequirement(requirementId);
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const fields: Parameters<typeof updateRequirement>[1] = {};
  if (typeof b?.title === "string" && b.title.trim()) fields.title = b.title.trim();
  if ("detail" in b) fields.detail = typeof b.detail === "string" && b.detail.trim() ? b.detail.trim() : null;
  if (REQUIREMENT_STATUSES.includes(b?.status)) fields.status = b.status as RequirementStatus;
  if ("toRole" in b) fields.toRole = typeof b.toRole === "string" && b.toRole ? b.toRole : null;
  if ("toSupplierId" in b) fields.toSupplierId = typeof b.toSupplierId === "string" && b.toSupplierId ? b.toSupplierId : null;
  if ("momentId" in b) fields.momentId = typeof b.momentId === "string" && b.momentId ? b.momentId : null;
  if ("serviceId" in b) fields.serviceId = typeof b.serviceId === "string" && b.serviceId ? b.serviceId : null;

  const requirement = await updateRequirement(requirementId, fields);

  // Audit: prefer a status-change summary; otherwise a generic edit.
  const changes = diff(
    { title: before.title, detail: before.detail, status: before.status },
    { title: requirement.title, detail: requirement.detail, status: requirement.status }
  );
  if (Object.keys(changes).length > 0) {
    const statusChanged = fields.status !== undefined && before.status !== requirement.status;
    await recordEvent({
      weddingId: before.weddingId,
      actor,
      action: statusChanged ? "requirement.status_changed" : "requirement.updated",
      entityType: "requirement",
      entityId: requirement.id,
      summary: statusChanged
        ? `Marcou «${before.title}» como ${STATUS_LABELS[requirement.status] ?? requirement.status}`
        : `Editou o pedido «${requirement.title}»`,
      supplierId: before.toSupplierId ?? (supplierActor ? wrSupplierId : null),
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
