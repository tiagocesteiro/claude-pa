import type { Venue } from "@prisma/client";
import { prisma } from "./client";

export function createVenue(input: { name: string; location?: string }): Promise<Venue> {
  return prisma.venue.create({ data: { name: input.name, location: input.location } });
}

export function listVenues(): Promise<Venue[]> {
  return prisma.venue.findMany({ orderBy: { createdAt: "desc" } });
}

export function getVenue(id: string): Promise<Venue | null> {
  return prisma.venue.findUnique({ where: { id } });
}
