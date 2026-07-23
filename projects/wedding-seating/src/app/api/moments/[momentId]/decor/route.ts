import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getMoment } from "@/lib/db/moments";
import { listMomentDecor, addDecorFromCatalog, addCustomDecor } from "@/lib/db/momentDecor";
import { assertMomentAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent } from "@/lib/db/audit";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentAccess(actor, momentId, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ decor: await listMomentDecor(momentId) });
}

/** Add a decoration line: either a venue catalog item ({ decorItemId, quantity? })
 * or the couple's own custom item ({ name, note?, quantity? }). */
export async function POST(req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentAccess(actor, momentId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const quantity = Number.isFinite(Number(b?.quantity)) && Number(b.quantity) > 0 ? Math.floor(Number(b.quantity)) : 1;

  if (b?.decorItemId) {
    // The catalog item must belong to the wedding's venue.
    const moment = await getMoment(momentId);
    const wedding = moment
      ? await prisma.wedding.findUnique({ where: { id: moment.weddingId }, select: { venueId: true } })
      : null;
    const item = await prisma.decorItem.findUnique({
      where: { id: b.decorItemId },
      select: { venueId: true, quantity: true, name: true },
    });
    if (!item || item.venueId !== wedding?.venueId) {
      return NextResponse.json({ error: "item de decoração inválido" }, { status: 400 });
    }
    // Stock guard: never let the couple request more than the venue has available.
    if (item.quantity != null && quantity > item.quantity) {
      return NextResponse.json(
        { error: `Stock insuficiente para "${item.name}" — disponível: ${item.quantity}.` },
        { status: 400 }
      );
    }
    const decor = await addDecorFromCatalog(momentId, b.decorItemId, quantity);
    if (moment) {
      await recordEvent({
        weddingId: moment.weddingId, actor, action: "decor.added", entityType: "decor", entityId: decor.id,
        summary: `Adicionou decoração «${item.name}»${quantity > 1 ? ` ×${quantity}` : ""}`,
      });
    }
    return NextResponse.json({ decor }, { status: 201 });
  }

  const name = typeof b?.name === "string" && b.name.trim() ? b.name.trim() : null;
  if (!name) return NextResponse.json({ error: "decorItemId ou name required" }, { status: 400 });
  const note = typeof b?.note === "string" && b.note.trim() ? b.note.trim() : null;
  const decor = await addCustomDecor(momentId, { name, note, quantity });
  const m = await getMoment(momentId);
  if (m) {
    await recordEvent({
      weddingId: m.weddingId, actor, action: "decor.added", entityType: "decor", entityId: decor.id,
      summary: `Adicionou decoração «${name}»${quantity > 1 ? ` ×${quantity}` : ""}`,
    });
  }
  return NextResponse.json({ decor }, { status: 201 });
}
