import { NextResponse } from "next/server";
import { listSupplierDecorItems, createSupplierDecorItem } from "@/lib/db/decorCatalog";
import { requireActor } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The current supplier (rental company) account's decoration catalog. */
export async function GET() {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  if (actor.role !== "supplier" && actor.role !== "admin") {
    return NextResponse.json({ error: "Apenas fornecedores." }, { status: 403 });
  }
  return NextResponse.json({ items: await listSupplierDecorItems(actor.userId) });
}

export async function POST(req: Request) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  if (actor.role !== "supplier" && actor.role !== "admin") {
    return NextResponse.json({ error: "Apenas fornecedores." }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  const name = typeof b?.name === "string" && b.name.trim() ? b.name.trim() : null;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const item = await createSupplierDecorItem(actor.userId, {
    name,
    category: typeof b?.category === "string" && b.category.trim() ? b.category.trim() : null,
    price: Number.isFinite(Number(b?.price)) && b?.price !== "" && b?.price != null ? Number(b.price) : null,
    quantity: Number.isFinite(Number(b?.quantity)) && b?.quantity !== "" && b?.quantity != null ? Number(b.quantity) : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}
