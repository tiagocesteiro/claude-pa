import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { listDecorItems, listSupplierDecorItems } from "@/lib/db/decorCatalog";
import { assertWeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

interface CatalogItem {
  id: string;
  name: string;
  category: string | null;
  image: string | null;
  price: number | null;
  quantity: number | null;
  source: string; // "Quinta" or the rental company's name
}

/** The decoration catalog available to a wedding: the venue's items PLUS the
 * catalog of the wedding's assigned decor supplier (rental company), each tagged
 * with its source. The couple (and venue) pick from here. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, ["venue", "couple", "admin"]);
  } catch (e) {
    return accessErrorResponse(e);
  }

  const wedding = await prisma.wedding.findUnique({
    where: { id },
    select: {
      venueId: true,
      suppliers: { where: { service: "decor" }, select: { name: true, profileId: true } },
    },
  });
  if (!wedding) return NextResponse.json({ items: [] });

  const out: CatalogItem[] = [];

  if (wedding.venueId) {
    for (const it of await listDecorItems(wedding.venueId)) {
      out.push({ id: it.id, name: it.name, category: it.category, image: it.image, price: it.price, quantity: it.quantity, source: "Quinta" });
    }
  }

  // Decor supplier(s) with a linked account → include their catalog.
  for (const s of wedding.suppliers) {
    if (!s.profileId) continue;
    for (const it of await listSupplierDecorItems(s.profileId)) {
      out.push({ id: it.id, name: it.name, category: it.category, image: it.image, price: it.price, quantity: it.quantity, source: s.name });
    }
  }

  return NextResponse.json({ items: out });
}
