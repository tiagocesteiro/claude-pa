import { NextResponse } from "next/server";
import { updateTemplate, deleteTemplate } from "@/lib/db/templates";
import { assertTemplateAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertTemplateAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const patch = Object.fromEntries(
    Object.entries({
      name: b?.name,
      minGuests: b?.minGuests,
      maxGuests: b?.maxGuests,
      lines: b?.lines,
      floorPlanId: b?.floorPlanId,
    }).filter(([, v]) => v !== undefined)
  );
  return NextResponse.json(await updateTemplate(id, patch));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertTemplateAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteTemplate(id);
  return NextResponse.json({ ok: true });
}
