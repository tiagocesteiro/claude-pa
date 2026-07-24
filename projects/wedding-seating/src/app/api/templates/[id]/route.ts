import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
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
  // Security (review L1): if reparenting to a floor plan, it must belong to this
  // template's own venue — never another venue's plan.
  if (typeof b?.floorPlanId === "string") {
    const [tpl, fp] = await Promise.all([
      prisma.layoutTemplate.findUnique({ where: { id }, select: { venueId: true } }),
      prisma.floorPlan.findUnique({ where: { id: b.floorPlanId }, select: { venueId: true } }),
    ]);
    if (!fp || !tpl || fp.venueId !== tpl.venueId) {
      return NextResponse.json({ error: "planta não pertence à quinta" }, { status: 400 });
    }
  }
  // Reassign the template's space (must belong to the same venue); "" clears it.
  if ("spaceId" in b) {
    const spaceId: string | null = typeof b.spaceId === "string" && b.spaceId ? b.spaceId : null;
    if (spaceId) {
      const [tpl, sp] = await Promise.all([
        prisma.layoutTemplate.findUnique({ where: { id }, select: { venueId: true } }),
        prisma.venueSpace.findUnique({ where: { id: spaceId }, select: { venueId: true } }),
      ]);
      if (!sp || !tpl || sp.venueId !== tpl.venueId) {
        return NextResponse.json({ error: "espaço não pertence à quinta" }, { status: 400 });
      }
    }
    await updateTemplate(id, { spaceId });
  }
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
