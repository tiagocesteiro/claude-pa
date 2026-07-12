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

export function updateGuestAttributes(
  guestId: string,
  attrs: { ageGroup?: string | null; gender?: string | null; dietary?: string | null }
): Promise<Guest> {
  const data: { ageGroup?: string | null; gender?: string | null; dietary?: string | null } = {};
  if ("ageGroup" in attrs) data.ageGroup = attrs.ageGroup ?? null;
  if ("gender" in attrs) data.gender = attrs.gender ?? null;
  if ("dietary" in attrs) data.dietary = attrs.dietary ?? null;
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
