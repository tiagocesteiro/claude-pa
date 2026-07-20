import { NextResponse } from "next/server";
import { listGuests, createGuest } from "@/lib/db/guests";
import { assertWeddingAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json(await listGuests(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  if (!b?.name || typeof b.name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const guest = await createGuest({
    weddingId: id,
    name: b.name,
    groupId: b.groupId ?? null,
    ageGroup: b.ageGroup ?? null,
    gender: b.gender ?? null,
    dietary: b.dietary ?? null,
  });
  return NextResponse.json(guest, { status: 201 });
}
