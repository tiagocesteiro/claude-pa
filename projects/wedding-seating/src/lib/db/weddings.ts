import type { Wedding } from "@prisma/client";
import { prisma } from "./client";

export function createWedding(input: { couple: string; date?: Date; floorPlanId?: string }): Promise<Wedding> {
  return prisma.wedding.create({ data: input });
}

export function getWedding(id: string): Promise<Wedding | null> {
  return prisma.wedding.findUnique({ where: { id } });
}

export function listWeddings(): Promise<Wedding[]> {
  return prisma.wedding.findMany({ orderBy: { createdAt: "desc" } });
}
