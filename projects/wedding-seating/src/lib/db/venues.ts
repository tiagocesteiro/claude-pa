import type { Venue } from "@prisma/client";
import { prisma } from "./client";

export function createVenue(input: {
  name: string;
  location?: string;
  ownerId?: string | null;
}): Promise<Venue> {
  return prisma.venue.create({
    data: { name: input.name, location: input.location, ownerId: input.ownerId ?? null },
  });
}

export function listVenues(): Promise<Venue[]> {
  return prisma.venue.findMany({ orderBy: { createdAt: "desc" } });
}

/** Minimal venue list for the couple's venue picker (any logged-in user may pick
 * a venue). Not owner-scoped by design — it's a public-ish directory of venues.
 * Fase D2 scopes the owner-facing `listVenues`, not this. */
export function listPickableVenues(): Promise<{ id: string; name: string; location: string | null }[]> {
  return prisma.venue.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true },
  });
}

export function getVenue(id: string): Promise<Venue | null> {
  return prisma.venue.findUnique({ where: { id } });
}

/** Deletes a venue and everything it owns (floor plans, table types, templates,
 * and — via cascade — those templates'/plans' tables). Weddings that referenced
 * this venue keep existing but have their venueId/floorPlanId/templateId nulled
 * (the relations are optional → SetNull). */
export function deleteVenue(id: string): Promise<Venue> {
  return prisma.venue.delete({ where: { id } });
}
