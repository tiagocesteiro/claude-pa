import type { VenueSpace } from "@prisma/client";
import { prisma } from "./client";

/** A venue's reusable space/area photos. Venue-owned; tenancy gated by the route.
 * Each wedding's moments pick a space image as their hero banner. */

export function listVenueSpaces(venueId: string): Promise<VenueSpace[]> {
  return prisma.venueSpace.findMany({ where: { venueId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
}

export function getVenueSpace(id: string): Promise<VenueSpace | null> {
  return prisma.venueSpace.findUnique({ where: { id } });
}

export function createVenueSpace(venueId: string, input: { name: string; image?: string | null }): Promise<VenueSpace> {
  return prisma.venueSpace.create({ data: { venueId, name: input.name, image: input.image ?? null } });
}

export function updateVenueSpace(id: string, fields: { name?: string; image?: string | null; order?: number }): Promise<VenueSpace> {
  const data: Record<string, unknown> = {};
  if ("name" in fields) data.name = fields.name;
  if ("image" in fields) data.image = fields.image;
  if ("order" in fields) data.order = fields.order;
  return prisma.venueSpace.update({ where: { id }, data });
}

export function deleteVenueSpace(id: string): Promise<VenueSpace> {
  return prisma.venueSpace.delete({ where: { id } });
}
