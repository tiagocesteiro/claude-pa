import { NextResponse } from "next/server";
import { updateMomentDecor, deleteMomentDecor } from "@/lib/db/momentDecor";
import { assertMomentDecorAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Edit a moment decoration line (quantity / note / custom name). */
export async function PATCH(req: Request, { params }: { params: Promise<{ decorId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { decorId } = await params;
  try {
    await assertMomentDecorAccess(actor, decorId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const fields: { quantity?: number; note?: string | null; name?: string | null } = {};
  if (Number.isFinite(Number(b?.quantity)) && Number(b.quantity) > 0) fields.quantity = Math.floor(Number(b.quantity));
  if ("note" in b) fields.note = b.note ? String(b.note) : null;
  if ("name" in b) fields.name = b.name ? String(b.name) : null;
  return NextResponse.json({ decor: await updateMomentDecor(decorId, fields) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ decorId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { decorId } = await params;
  try {
    await assertMomentDecorAccess(actor, decorId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteMomentDecor(decorId);
  return NextResponse.json({ ok: true });
}
