import { NextResponse } from "next/server";
import { createTableType, listTableTypes } from "@/lib/db/tableTypes";
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
  return NextResponse.json(await listTableTypes(id));
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
  if (!b?.name || typeof b.minSeats !== "number" || typeof b.maxSeats !== "number") {
    return NextResponse.json({ error: "name, minSeats, maxSeats required" }, { status: 400 });
  }
  const tableType = await createTableType({
    venueId: id,
    name: b.name,
    shape: b.shape,
    minSeats: b.minSeats,
    maxSeats: b.maxSeats,
    width: b.width,
    depth: b.depth,
    quantity: b.quantity,
  });
  return NextResponse.json(tableType, { status: 201 });
}
