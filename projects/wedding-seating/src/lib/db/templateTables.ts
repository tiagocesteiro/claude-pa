import type { Table } from "@prisma/client";
import { prisma } from "./client";
import type { TableInput } from "./tables";

export async function saveTemplateTables(templateId: string, tables: TableInput[]): Promise<void> {
  await prisma.$transaction([
    prisma.table.deleteMany({ where: { templateId } }),
    prisma.table.createMany({
      data: tables.map((t) => ({ ...t, templateId })),
    }),
  ]);
}

export function listTemplateTables(templateId: string): Promise<Table[]> {
  return prisma.table.findMany({ where: { templateId } });
}
