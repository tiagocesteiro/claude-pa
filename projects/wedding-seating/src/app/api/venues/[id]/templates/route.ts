import { NextResponse } from "next/server";
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
  const template = await createTemplate({
    venueId: id,
    floorPlanId: b.floorPlanId,
    name: b.name,
    minGuests: b.minGuests,
    maxGuests: b.maxGuests,
    lines: b.lines,
  });
  return NextResponse.json(template, { status: 201 });
}
