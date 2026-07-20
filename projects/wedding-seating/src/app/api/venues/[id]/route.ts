import { NextResponse } from "next/server";
import { deleteVenue, getVenue } from "@/lib/db/venues";
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
  const venue = await getVenue(id);
  if (!venue) return NextResponse.json({ error: "venue not found" }, { status: 404 });
  return NextResponse.json(venue);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertVenueAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteVenue(id);
  return NextResponse.json({ ok: true });
}
