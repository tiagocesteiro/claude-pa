import type { MomentDecor } from "@prisma/client";
import { prisma } from "./client";

/** Per-moment decoration lines: either a reference to a venue catalog item
 * (`decorItemId`) or the couple's own custom item (`name`/`note`). Moment-owned;
 * tenancy gated by the route (which also validates the catalog item's venue). */

/** Decor lines with the referenced catalog item (if any) resolved for display. */
export function listMomentDecor(momentId: string) {
  return prisma.momentDecor.findMany({
    where: { momentId },
    orderBy: { createdAt: "asc" },
    include: { decorItem: { select: { name: true, category: true, image: true, price: true } } },
  });
}

export function getMomentDecor(id: string): Promise<MomentDecor | null> {
  return prisma.momentDecor.findUnique({ where: { id } });
}

/** Add a line referencing a venue catalog item. */
export function addDecorFromCatalog(
  momentId: string,
  decorItemId: string,
  quantity = 1
): Promise<MomentDecor> {
  return prisma.momentDecor.create({ data: { momentId, decorItemId, quantity } });
}

/** Add the couple's own custom decoration line (no catalog reference). */
export function addCustomDecor(
  momentId: string,
  input: { name: string; note?: string | null; quantity?: number }
): Promise<MomentDecor> {
  return prisma.momentDecor.create({
    data: {
      momentId,
      name: input.name,
      note: input.note ?? null,
      quantity: input.quantity ?? 1,
    },
  });
}

export function updateMomentDecor(
  id: string,
  fields: { quantity?: number; note?: string | null; name?: string | null }
): Promise<MomentDecor> {
  const data: Record<string, unknown> = {};
  if ("quantity" in fields) data.quantity = fields.quantity;
  if ("note" in fields) data.note = fields.note;
  if ("name" in fields) data.name = fields.name;
  return prisma.momentDecor.update({ where: { id }, data });
}

export function deleteMomentDecor(id: string): Promise<MomentDecor> {
  return prisma.momentDecor.delete({ where: { id } });
}
