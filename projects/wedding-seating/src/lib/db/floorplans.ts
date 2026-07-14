import type { FloorPlan } from "@prisma/client";
import { prisma } from "./client";

export function createFloorPlan(input: {
  venueId: string;
  image: string;
  scale: number;
  width: number;
  depth: number;
  name?: string | null;
}): Promise<FloorPlan> {
  return prisma.floorPlan.create({ data: input });
}

export function getFloorPlan(id: string): Promise<FloorPlan | null> {
  return prisma.floorPlan.findUnique({ where: { id } });
}

export function updateFloorPlanName(id: string, name: string | null): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: { name } });
}

/** Deletes a layout and everything built on it: its tables + any LayoutTemplates
 * positioned on it (which cascade their own tables). Wedding moments / weddings that
 * referenced this plan or those templates have their references nulled (SetNull). */
export function deleteFloorPlan(id: string): Promise<unknown> {
  return prisma.$transaction([
    prisma.layoutTemplate.deleteMany({ where: { floorPlanId: id } }),
    prisma.floorPlan.delete({ where: { id } }),
  ]);
}

export function updateFloorPlanScale(id: string, scale: number): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: { scale } });
}

/** Plan 18 Task 7: set/replace a "blank room" floor plan's dimensions + derived
 * scale together (used by the editor's "Sala sem planta" control — no photo, the
 * room itself is defined by these metres + the fit scale computed from them). */
export function updateFloorPlanDimensions(
  id: string,
  input: { width: number; depth: number; scale: number }
): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: input });
}

export function updateFloorPlanSpacing(id: string, minSpacing: number | null): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: { minSpacing } });
}

export function updateFloorPlanBoundary(id: string, boundary: string | null): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: { boundary } });
}

export function updateFloorPlanZones(id: string, zones: string | null): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: { zones } });
}
