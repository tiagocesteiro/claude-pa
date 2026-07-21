import type { DecorItem } from "@prisma/client";
import { prisma } from "./client";

/** The venue's decoration catalog (dataset). Venue-owned; couples pick from it per
 * moment. Tenancy gated by the route (venue writes; couple reads its booked venue). */

export function listDecorItems(venueId: string): Promise<DecorItem[]> {
  return prisma.decorItem.findMany({ where: { venueId }, orderBy: { name: "asc" } });
}

export function getDecorItem(id: string): Promise<DecorItem | null> {
  return prisma.decorItem.findUnique({ where: { id } });
}

export function createDecorItem(
  venueId: string,
  input: { name: string; category?: string | null; image?: string | null; price?: number | null; quantity?: number | null }
): Promise<DecorItem> {
  return prisma.decorItem.create({
    data: {
      venueId,
      name: input.name,
      category: input.category ?? null,
      image: input.image ?? null,
      price: input.price ?? null,
      quantity: input.quantity ?? null,
    },
  });
}

export function updateDecorItem(
  id: string,
  fields: { name?: string; category?: string | null; image?: string | null; price?: number | null; quantity?: number | null }
): Promise<DecorItem> {
  const data: Record<string, unknown> = {};
  if ("name" in fields) data.name = fields.name;
  if ("category" in fields) data.category = fields.category;
  if ("image" in fields) data.image = fields.image;
  if ("price" in fields) data.price = fields.price;
  if ("quantity" in fields) data.quantity = fields.quantity;
  return prisma.decorItem.update({ where: { id }, data });
}

export function deleteDecorItem(id: string): Promise<DecorItem> {
  return prisma.decorItem.delete({ where: { id } });
}
