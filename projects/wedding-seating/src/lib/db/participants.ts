import type { WeddingParticipant } from "@prisma/client";
import { prisma } from "./client";

/**
 * Who takes part in a wedding and in which role (venue owner / couple / supplier).
 * The single place access resolves participation (see `getWeddingRole` in
 * `src/lib/auth/access.ts`). Tenancy on these operations is gated by the routes.
 */

export type ParticipantRole = "venue" | "couple" | "supplier";

export function listParticipants(weddingId: string): Promise<WeddingParticipant[]> {
  return prisma.weddingParticipant.findMany({ where: { weddingId }, orderBy: { createdAt: "asc" } });
}

export function getParticipant(weddingId: string, profileId: string): Promise<WeddingParticipant | null> {
  return prisma.weddingParticipant.findUnique({
    where: { weddingId_profileId: { weddingId, profileId } },
  });
}

/** Add (or update the role/supplier of) a participant — idempotent per
 * (wedding, profile). Used on wedding creation (venue), and on invite-accept. */
export function addParticipant(
  weddingId: string,
  profileId: string,
  role: ParticipantRole,
  supplierId: string | null = null
): Promise<WeddingParticipant> {
  return prisma.weddingParticipant.upsert({
    where: { weddingId_profileId: { weddingId, profileId } },
    create: { weddingId, profileId, role, supplierId },
    update: { role, supplierId },
  });
}

export async function removeParticipant(weddingId: string, profileId: string): Promise<void> {
  await prisma.weddingParticipant.deleteMany({ where: { weddingId, profileId } });
}

/** Mark the activity log of a wedding as seen by a participant (resets their
 * "novidades" badge). No-op if they aren't a participant. */
export async function markActivitySeen(weddingId: string, profileId: string): Promise<void> {
  await prisma.weddingParticipant.updateMany({
    where: { weddingId, profileId },
    data: { lastSeenActivityAt: new Date() },
  });
}

/** The participant's last-seen timestamp for a wedding's activity (null if never
 * seen or not a participant). */
export async function getLastSeenActivity(weddingId: string, profileId: string): Promise<Date | null> {
  const p = await prisma.weddingParticipant.findUnique({
    where: { weddingId_profileId: { weddingId, profileId } },
    select: { lastSeenActivityAt: true },
  });
  return p?.lastSeenActivityAt ?? null;
}

/** The weddings a given profile takes part in (any role) — for a supplier's or
 * couple's "my weddings" list. */
export function listWeddingIdsForProfile(profileId: string): Promise<{ weddingId: string; role: string }[]> {
  return prisma.weddingParticipant.findMany({
    where: { profileId },
    select: { weddingId: true, role: true },
    orderBy: { createdAt: "desc" },
  });
}
