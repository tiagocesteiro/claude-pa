import type { Constraint } from "@prisma/client";
import { prisma } from "./client";

export function createConstraint(input: {
  weddingId: string;
  type: "together" | "separate";
  guestAId: string;
  guestBId: string;
}): Promise<Constraint> {
  return prisma.constraint.create({ data: input });
}

export function listConstraints(weddingId: string): Promise<Constraint[]> {
  return prisma.constraint.findMany({ where: { weddingId } });
}

export async function deleteConstraint(id: string): Promise<void> {
  await prisma.constraint.delete({ where: { id } });
}
