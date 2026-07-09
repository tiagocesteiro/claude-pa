import type { TableType } from "@prisma/client";
import { prisma } from "./client";

export function createTableType(input: {
  venueId: string; name: string; shape: string; minSeats: number; maxSeats: number; width: number; depth: number; quantity?: number;
}): Promise<TableType> {
  return prisma.tableType.create({ data: { ...input, quantity: input.quantity ?? 1 } });
}
export function listTableTypes(venueId: string): Promise<TableType[]> {
  return prisma.tableType.findMany({ where: { venueId }, orderBy: { createdAt: "asc" } });
}
export function updateTableType(id: string, patch: Partial<Omit<TableType, "id" | "venueId" | "createdAt">>): Promise<TableType> {
  return prisma.tableType.update({ where: { id }, data: patch });
}
export async function deleteTableType(id: string): Promise<void> {
  await prisma.tableType.delete({ where: { id } });
}
