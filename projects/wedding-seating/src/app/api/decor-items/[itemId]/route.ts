import { NextResponse } from "next/server";
import { updateDecorItem, deleteDecorItem } from "@/lib/db/decorCatalog";
import { assertDecorItemAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { itemId } = await params;
  try {
    await assertDecorItemAccess(actor, itemId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const fields: { name?: string; category?: string | null; image?: string | null; price?: number | null; quantity?: number | null } = {};
  if (typeof b?.name === "string" && b.name.trim()) fields.name = b.name.trim();
  if ("category" in b) fields.category = b.category ? String(b.category) : null;
  if ("image" in b) fields.image = b.image ? String(b.image) : null;
  if ("price" in b) {
    const p = b.price === "" || b.price == null ? null : Number(b.price);
    fields.price = p != null && Number.isFinite(p) ? p : null;
  }
  if ("quantity" in b) {
    const q = b.quantity === "" || b.quantity == null ? null : Number(b.quantity);
    fields.quantity = q != null && Number.isFinite(q) ? Math.floor(q) : null;
  }
  return NextResponse.json({ item: await updateDecorItem(itemId, fields) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { itemId } = await params;
  try {
    await assertDecorItemAccess(actor, itemId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteDecorItem(itemId);
  return NextResponse.json({ ok: true });
}
