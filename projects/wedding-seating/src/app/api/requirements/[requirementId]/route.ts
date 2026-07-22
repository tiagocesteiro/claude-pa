import { NextResponse } from "next/server";
import { updateRequirement, deleteRequirement, REQUIREMENT_STATUSES, type RequirementStatus } from "@/lib/db/requirements";
import { assertRequirementAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ requirementId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { requirementId } = await params;
  try {
    await assertRequirementAccess(actor, requirementId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
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
  return NextResponse.json({ requirement });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ requirementId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { requirementId } = await params;
  try {
    await assertRequirementAccess(actor, requirementId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteRequirement(requirementId);
  return NextResponse.json({ ok: true });
}
