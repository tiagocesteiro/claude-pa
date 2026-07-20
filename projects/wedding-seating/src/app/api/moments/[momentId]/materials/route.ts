import { NextResponse } from "next/server";
import { listMomentMaterials, createMaterial } from "@/lib/db/materials";
import { assertMomentVenueAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Venue-only extra material for a moment (couples are denied by the gate). */
export async function GET(_req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentVenueAccess(actor, momentId, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ materials: await listMomentMaterials(momentId) });
}

export async function POST(req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentVenueAccess(actor, momentId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const name = typeof b?.name === "string" && b.name.trim() ? b.name.trim() : null;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const quantity = Number.isFinite(Number(b?.quantity)) ? Number(b.quantity) : 1;
  const note = typeof b?.note === "string" && b.note.trim() ? b.note.trim() : null;
  const material = await createMaterial(momentId, { name, quantity, note });
  return NextResponse.json({ material }, { status: 201 });
}
