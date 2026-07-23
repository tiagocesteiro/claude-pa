import { NextResponse } from "next/server";
import { updateRequirementTemplate, deleteRequirementTemplate } from "@/lib/db/requirementTemplates";
import { assertRequirementTemplateAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { templateId } = await params;
  try {
    await assertRequirementTemplateAccess(actor, templateId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const fields: Parameters<typeof updateRequirementTemplate>[1] = {};
  if (b?.kind === "question" || b?.kind === "request") fields.kind = b.kind;
  if ("service" in b) fields.service = typeof b.service === "string" && b.service.trim() ? b.service.trim() : null;
  if (typeof b?.title === "string" && b.title.trim()) fields.title = b.title.trim();
  if ("detail" in b) fields.detail = typeof b.detail === "string" && b.detail.trim() ? b.detail.trim() : null;
  if (typeof b?.order === "number") fields.order = b.order;
  const template = await updateRequirementTemplate(templateId, fields);
  return NextResponse.json({ template });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { templateId } = await params;
  try {
    await assertRequirementTemplateAccess(actor, templateId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteRequirementTemplate(templateId);
  return NextResponse.json({ ok: true });
}
