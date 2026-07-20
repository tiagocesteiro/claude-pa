import { prisma } from "./client";

/**
 * Persist seat assignments — SCOPED to `weddingId` (security: the guest ids come
 * from the request body, so each update is constrained to this wedding's guests
 * via updateMany's where-clause; a foreign guest id simply matches 0 rows instead
 * of mutating another couple's data). See Fase D security review C1.
 */
export async function saveAssignment(
  weddingId: string,
  assignments: { guestId: string; tableId: string | null }[]
): Promise<void> {
  await prisma.$transaction(
    assignments.map((a) =>
      prisma.guest.updateMany({
        where: { id: a.guestId, weddingId },
        data: { assignedTableId: a.tableId },
      })
    )
  );
}

export async function clearAssignment(weddingId: string): Promise<void> {
  await prisma.guest.updateMany({ where: { weddingId }, data: { assignedTableId: null } });
}
