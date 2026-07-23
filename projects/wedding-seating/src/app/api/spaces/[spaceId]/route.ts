import { NextResponse } from "next/server";
import { updateVenueSpace, deleteVenueSpace } from "@/lib/db/venueSpaces";
import { assertVenueSpaceAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { spaceId } = await params;
  try {
    await assertVenueSpaceAccess(actor, spaceId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const fields: { name?: string; order?: number } = {};
  if (typeof b?.name === "string" && b.name.trim()) fields.name = b.name.trim();
  if (typeof b?.order === "number") fields.order = b.order;
  return NextResponse.json({ space: await updateVenueSpace(spaceId, fields) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { spaceId } = await params;
  try {
    await assertVenueSpaceAccess(actor, spaceId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteVenueSpace(spaceId);
  return NextResponse.json({ ok: true });
}
