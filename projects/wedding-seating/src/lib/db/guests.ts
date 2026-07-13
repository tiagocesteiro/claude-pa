import type { Guest } from "@prisma/client";
import { prisma } from "./client";

export function listGuests(weddingId: string): Promise<Guest[]> {
  return prisma.guest.findMany({ where: { weddingId } });
}

export function assignGuestGroup(guestId: string, groupId: string | null): Promise<Guest> {
  return prisma.guest.update({ where: { id: guestId }, data: { groupId } });
}

export function createGuest(input: {
  weddingId: string;
  name: string;
  groupId?: string | null;
  ageGroup?: string | null;
  gender?: string | null;
  dietary?: string | null;
}): Promise<Guest> {
  return prisma.guest.create({
    data: {
      weddingId: input.weddingId,
      name: input.name,
      groupId: input.groupId ?? null,
      ageGroup: input.ageGroup ?? null,
      gender: input.gender ?? null,
      dietary: input.dietary ?? null,
    },
  });
}

export function setGuestLocked(guestId: string, locked: boolean): Promise<Guest> {
  return prisma.guest.update({ where: { id: guestId }, data: { locked } });
}

export const RSVP_VALUES = ["pending", "confirmed", "declined"] as const;
export type RsvpValue = (typeof RSVP_VALUES)[number];

export function isRsvpValue(value: unknown): value is RsvpValue {
  return typeof value === "string" && (RSVP_VALUES as readonly string[]).includes(value);
}

export function updateGuestAttributes(
  guestId: string,
  attrs: {
    ageGroup?: string | null;
    gender?: string | null;
    dietary?: string | null;
    rsvp?: string | null;
  }
): Promise<Guest> {
  const data: {
    ageGroup?: string | null;
    gender?: string | null;
    dietary?: string | null;
    rsvp?: string | null;
  } = {};
  if ("ageGroup" in attrs) data.ageGroup = attrs.ageGroup ?? null;
  if ("gender" in attrs) data.gender = attrs.gender ?? null;
  if ("dietary" in attrs) data.dietary = attrs.dietary ?? null;
  if ("rsvp" in attrs && isRsvpValue(attrs.rsvp)) data.rsvp = attrs.rsvp;
  return prisma.guest.update({ where: { id: guestId }, data });
}

export function setGuestGroups(
  guestId: string,
  primaryGroupId: string | null,
  extraGroupIds: string[]
): Promise<Guest> {
  return prisma.guest.update({
    where: { id: guestId },
    data: {
      groupId: primaryGroupId,
      extraGroups: extraGroupIds.length ? JSON.stringify(extraGroupIds) : null,
    },
  });
}

/**
 * Symmetric plus-one pairing. Guarantees at most one active pair per guest:
 * - partnerId === null: unpairs guestId (and frees its current partner's back-link, if any).
 * - partnerId !== null: pairs guestId <-> partnerId, first freeing any existing partner of
 *   EITHER guest (so re-pairing cleanly frees the old partners on both sides).
 * Returns the updated guestId row, or null if guestId/partnerId don't share a wedding
 * or partnerId === guestId (caller should treat this as a 400).
 */
export async function setPlusOne(guestId: string, partnerId: string | null): Promise<Guest | null> {
  return prisma.$transaction(async (tx) => {
    const guest = await tx.guest.findUnique({ where: { id: guestId } });
    if (!guest) return null;

    if (partnerId === null) {
      if (guest.plusOneId) {
        await tx.guest.update({ where: { id: guest.plusOneId }, data: { plusOneId: null } });
      }
      return tx.guest.update({ where: { id: guestId }, data: { plusOneId: null } });
    }

    if (partnerId === guestId) return null;

    const partner = await tx.guest.findUnique({ where: { id: partnerId } });
    if (!partner || partner.weddingId !== guest.weddingId) return null;

    // Free guestId's existing partner (if different from the new partner).
    if (guest.plusOneId && guest.plusOneId !== partnerId) {
      await tx.guest.update({ where: { id: guest.plusOneId }, data: { plusOneId: null } });
    }
    // Free partnerId's existing partner (if different from guestId).
    if (partner.plusOneId && partner.plusOneId !== guestId) {
      await tx.guest.update({ where: { id: partner.plusOneId }, data: { plusOneId: null } });
    }

    await tx.guest.update({ where: { id: partnerId }, data: { plusOneId: guestId } });
    return tx.guest.update({ where: { id: guestId }, data: { plusOneId: partnerId } });
  });
}
