import { NextResponse } from "next/server";
import { listVenueSpaces, createVenueSpace } from "@/lib/db/venueSpaces";
import { assertVenueAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertVenueAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ spaces: await listVenueSpaces(id) });
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
  const name = typeof b?.name === "string" && b.name.trim() ? b.name.trim() : null;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const space = await createVenueSpace(id, { name });
  return NextResponse.json({ space }, { status: 201 });
}
