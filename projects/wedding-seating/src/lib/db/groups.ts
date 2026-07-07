import type { Group } from "@prisma/client";
import { prisma } from "./client";

export function createGroup(input: { weddingId: string; name: string; color?: string }): Promise<Group> {
  return prisma.group.create({ data: input });
}

export function listGroups(weddingId: string): Promise<Group[]> {
  return prisma.group.findMany({ where: { weddingId } });
}

export function renameGroup(id: string, name: string): Promise<Group> {
  return prisma.group.update({ where: { id }, data: { name } });
}

export async function deleteGroup(id: string): Promise<void> {
  await prisma.group.delete({ where: { id } });
}
