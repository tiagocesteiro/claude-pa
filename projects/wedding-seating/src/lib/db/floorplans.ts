import type { FloorPlan } from "@prisma/client";
import { prisma } from "./client";

export function createFloorPlan(input: {
  venueId: string;
  image: string;
  scale: number;
  width: number;
  depth: number;
}): Promise<FloorPlan> {
  return prisma.floorPlan.create({ data: input });
}

export function getFloorPlan(id: string): Promise<FloorPlan | null> {
  return prisma.floorPlan.findUnique({ where: { id } });
}

export function updateFloorPlanScale(id: string, scale: number): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: { scale } });
}
