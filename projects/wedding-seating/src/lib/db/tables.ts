import type { Table } from "@prisma/client";
import { prisma } from "./client";

export interface TableInput {
  shape: "round" | "rect";
  capacity: number;
  x: number;
  y: number;
  fixed: boolean;
}

export async function saveTables(floorPlanId: string, tables: TableInput[]): Promise<void> {
  await prisma.$transaction([
    prisma.table.deleteMany({ where: { floorPlanId } }),
    prisma.table.createMany({
      data: tables.map((t) => ({ ...t, floorPlanId })),
    }),
  ]);
}

export function listTables(floorPlanId: string): Promise<Table[]> {
  return prisma.table.findMany({ where: { floorPlanId } });
}
