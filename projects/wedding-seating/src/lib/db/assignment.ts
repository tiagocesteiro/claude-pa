import { prisma } from "./client";

export async function saveAssignment(
  assignments: { guestId: string; tableId: string | null }[]
): Promise<void> {
  await prisma.$transaction(
    assignments.map((a) =>
      prisma.guest.update({ where: { id: a.guestId }, data: { assignedTableId: a.tableId } })
    )
  );
}

export async function clearAssignment(weddingId: string): Promise<void> {
  await prisma.guest.updateMany({ where: { weddingId }, data: { assignedTableId: null } });
}
