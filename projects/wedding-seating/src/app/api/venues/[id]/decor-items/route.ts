import { NextResponse } from "next/server";
import { listDecorItems, createDecorItem } from "@/lib/db/decorCatalog";
import { assertVenueAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The venue's decoration catalog. Venue writes; couple reads a venue it booked. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertVenueAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ items: await listDecorItems(id) });
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
  const price = b?.price === "" || b?.price == null ? null : Number(b.price);
  const quantity = b?.quantity === "" || b?.quantity == null ? null : Number(b.quantity);
  const item = await createDecorItem(id, {
    name,
    category: typeof b?.category === "string" && b.category.trim() ? b.category.trim() : null,
    image: typeof b?.image === "string" && b.image.trim() ? b.image.trim() : null,
    price: price != null && Number.isFinite(price) ? price : null,
    quantity: quantity != null && Number.isFinite(quantity) ? Math.floor(quantity) : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}
