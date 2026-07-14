import type { Table } from "@prisma/client";
import { prisma } from "./client";
import type { TableInput } from "./tables";

export function listWeddingTables(weddingId: string): Promise<Table[]> {
  return prisma.table.findMany({ where: { weddingId } });
}

/** A wedding table with an optional existing id. Unlike the floor-plan/template
 * `saveTables` (delete-all + recreate — safe there, nothing references those ids),
 * a wedding's tables are referenced by `Guest.assignedTableId` (a plain string
 * column, no FK). Blindly recreating every table on every edit would mint fresh
 * ids for ALL tables and silently orphan every guest's seat, not just the removed
 * table's. So `id` (when it matches a table this wedding already owns) means
 * "update in place, keep this id"; omitted/unrecognized ids are created fresh. */
export interface WeddingTableInput extends TableInput {
  id?: string;
}

export async function saveWeddingTables(weddingId: string, tables: WeddingTableInput[]): Promise<void> {
  const existing = await prisma.table.findMany({ where: { weddingId }, select: { id: true } });
  const existingIds = new Set(existing.map((t) => t.id));

  const toUpdate = tables.filter(
    (t): t is WeddingTableInput & { id: string } => !!t.id && existingIds.has(t.id)
  );
  const toCreate = tables.filter((t) => !t.id || !existingIds.has(t.id));
  const keepIds = new Set(toUpdate.map((t) => t.id));
  const removedIds = existing.map((t) => t.id).filter((id) => !keepIds.has(id));

  await prisma.$transaction([
    ...toUpdate.map((t) =>
      prisma.table.update({
        where: { id: t.id },
        data: {
          shape: t.shape,
          capacity: t.capacity,
          x: t.x,
          y: t.y,
          fixed: t.fixed,
          width: t.width ?? null,
          depth: t.depth ?? null,
          minCapacity: t.minCapacity ?? null,
          name: t.name ?? null,
          heads: t.heads ?? null,
        },
      })
    ),
    ...(toCreate.length
      ? [
          prisma.table.createMany({
            data: toCreate.map(({ id, ...rest }) => {
              void id;
              return { ...rest, weddingId };
            }),
          }),
        ]
      : []),
    // Guests seated at a removed table become unassigned (never leave a dangling
    // assignedTableId pointing at a table that no longer exists).
    ...(removedIds.length
      ? [
          prisma.guest.updateMany({
            where: { weddingId, assignedTableId: { in: removedIds } },
            data: { assignedTableId: null },
          }),
          prisma.table.deleteMany({ where: { id: { in: removedIds } } }),
        ]
      : []),
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
    name: t.name,
    heads: t.heads,
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
