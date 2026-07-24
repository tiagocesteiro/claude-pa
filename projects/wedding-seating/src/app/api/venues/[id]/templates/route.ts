import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createTemplate, listTemplates } from "@/lib/db/templates";
import { assertVenueAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertVenueAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json(await listTemplates(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertVenueAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  if (!b?.name || typeof b.minGuests !== "number" || typeof b.maxGuests !== "number") {
    return NextResponse.json({ error: "name, minGuests, maxGuests required" }, { status: 400 });
  }
  // Security (review L1): a template's floor plan must belong to the SAME venue —
  // never another venue's plan (which would leak its image via the template list).
  if (b.floorPlanId) {
    const fp = await prisma.floorPlan.findUnique({
      where: { id: b.floorPlanId },
      select: { venueId: true },
    });
    if (!fp || fp.venueId !== id) {
      return NextResponse.json({ error: "planta não pertence à quinta" }, { status: 400 });
    }
  }
  let spaceId: string | null = null;
  if (typeof b.spaceId === "string" && b.spaceId) {
    const sp = await prisma.venueSpace.findUnique({ where: { id: b.spaceId }, select: { venueId: true } });
    if (!sp || sp.venueId !== id) return NextResponse.json({ error: "espaço não pertence à quinta" }, { status: 400 });
    spaceId = b.spaceId;
  }
  const template = await createTemplate({
    venueId: id,
    floorPlanId: b.floorPlanId,
    spaceId,
    name: b.name,
    minGuests: b.minGuests,
    maxGuests: b.maxGuests,
    lines: b.lines,
  });
  return NextResponse.json(template, { status: 201 });
}
