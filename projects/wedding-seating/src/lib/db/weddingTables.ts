import type { Table } from "@prisma/client";
import { prisma } from "./client";
import type { TableInput } from "./tables";

export function listWeddingTables(weddingId: string): Promise<Table[]> {
  return prisma.table.findMany({ where: { weddingId } });
}

export async function saveWeddingTables(weddingId: string, tables: TableInput[]): Promise<void> {
  await prisma.$transaction([
    prisma.table.deleteMany({ where: { weddingId } }),
    prisma.table.createMany({
      data: tables.map((t) => ({ ...t, weddingId })),
    }),
  ]);
}

export async function applyTemplateToWedding(
  weddingId: string,
  templateId: string
): Promise<{ copied: number }> {
  const template = await prisma.layoutTemplate.findUniqueOrThrow({ where: { id: templateId } });
  const templateTables = await prisma.table.findMany({ where: { templateId } });

  const copies = templateTables.map((t) => ({
    shape: t.shape,
    capacity: t.capacity,
    minCapacity: t.minCapacity,
    width: t.width,
    depth: t.depth,
    x: t.x,
    y: t.y,
    fixed: t.fixed,
    weddingId,
  }));

  await prisma.$transaction([
    prisma.table.deleteMany({ where: { weddingId } }),
    prisma.table.createMany({ data: copies }),
    prisma.wedding.update({
      where: { id: weddingId },
      data: { floorPlanId: template.floorPlanId, templateId },
    }),
    prisma.guest.updateMany({ where: { weddingId }, data: { assignedTableId: null } }),
  ]);

  return { copied: copies.length };
}
