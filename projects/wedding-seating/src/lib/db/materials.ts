import type { MomentMaterial } from "@prisma/client";
import { prisma } from "./client";

/** Venue-only extra material per moment (e.g. "tomadas triplas para o DJ").
 * Tenancy gated by the route (venue booking). Never exposed to the couple. */

export function listMomentMaterials(momentId: string): Promise<MomentMaterial[]> {
  return prisma.momentMaterial.findMany({ where: { momentId }, orderBy: { createdAt: "asc" } });
}

export function createMaterial(
  momentId: string,
  input: { name: string; quantity?: number; note?: string | null }
): Promise<MomentMaterial> {
  return prisma.momentMaterial.create({
    data: {
      momentId,
      name: input.name,
      quantity: input.quantity && input.quantity > 0 ? Math.floor(input.quantity) : 1,
      note: input.note ?? null,
    },
  });
}

export function updateMaterial(
  id: string,
  fields: { name?: string; quantity?: number; note?: string | null }
): Promise<MomentMaterial> {
  const data: Record<string, unknown> = {};
  if ("name" in fields) data.name = fields.name;
  if ("quantity" in fields && fields.quantity && fields.quantity > 0) data.quantity = Math.floor(fields.quantity);
  if ("note" in fields) data.note = fields.note;
  return prisma.momentMaterial.update({ where: { id }, data });
}

export function deleteMaterial(id: string): Promise<MomentMaterial> {
  return prisma.momentMaterial.delete({ where: { id } });
}
