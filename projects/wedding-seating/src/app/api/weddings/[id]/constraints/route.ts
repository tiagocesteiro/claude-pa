import { NextResponse } from "next/server";
import { createConstraint, listConstraints } from "@/lib/db/constraints";
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
  return NextResponse.json(await listConstraints(id));
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
  if ((b?.type !== "together" && b?.type !== "separate") || !b?.guestAId || !b?.guestBId) {
    return NextResponse.json({ error: "type (together|separate), guestAId, guestBId required" }, { status: 400 });
  }
  if (b.guestAId === b.guestBId) {
    return NextResponse.json({ error: "a constraint needs two different guests" }, { status: 400 });
  }
  return NextResponse.json(
    await createConstraint({ weddingId: id, type: b.type, guestAId: b.guestAId, guestBId: b.guestBId }),
    { status: 201 }
  );
}
