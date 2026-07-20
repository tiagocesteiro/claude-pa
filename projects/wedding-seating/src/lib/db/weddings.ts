import type { Wedding } from "@prisma/client";
import { prisma } from "./client";
import { MOMENT_KINDS } from "./moments";

export interface WeddingDetailFields {
  couple?: string;
  date?: Date | null;
  venueId?: string | null;
  partner1?: string | null;
  partner1Email?: string | null;
  partner1Phone?: string | null;
  partner2?: string | null;
  partner2Email?: string | null;
  partner2Phone?: string | null;
  guestEstimate?: number | null;
  notes?: string | null;
}

export function createWedding(input: {
  couple: string;
  date?: Date;
  floorPlanId?: string;
  ownerId?: string | null;
  venueId?: string | null;
  partner1?: string | null;
  partner1Email?: string | null;
  partner1Phone?: string | null;
  partner2?: string | null;
  partner2Email?: string | null;
  partner2Phone?: string | null;
  guestEstimate?: number | null;
  notes?: string | null;
}): Promise<Wedding> {
  return prisma.$transaction(async (tx) => {
    const wedding = await tx.wedding.create({ data: input });
    await tx.weddingMoment.createMany({
      data: MOMENT_KINDS.map((kind) => ({ weddingId: wedding.id, kind, floorPlanId: null })),
    });
    return wedding;
  });
}

export function getWedding(id: string): Promise<Wedding | null> {
  return prisma.wedding.findUnique({ where: { id } });
}

export function getWeddingDetail(id: string) {
  return prisma.wedding.findUnique({
    where: { id },
    include: {
      venue: true,
      moments: { include: { floorPlan: true, template: { include: { floorPlan: true } } } },
    },
  });
}

export function listWeddings(): Promise<Wedding[]> {
  return prisma.wedding.findMany({ orderBy: { createdAt: "desc" } });
}

/** Deletes a wedding and all of its data (guests, groups, constraints, moments,
 * and its copied tables) — all those relations are onDelete: Cascade. */
export function deleteWedding(id: string): Promise<Wedding> {
  return prisma.wedding.delete({ where: { id } });
}

/** Whitelisted update of wedding "detail" fields only — never touches
 * tables/guests/templateId (those are owned by the seating/template-apply flow). */
export function updateWedding(id: string, fields: WeddingDetailFields): Promise<Wedding> {
  const data: WeddingDetailFields = {};
  if ("couple" in fields) data.couple = fields.couple;
  if ("date" in fields) data.date = fields.date;
  if ("venueId" in fields) data.venueId = fields.venueId;
  if ("partner1" in fields) data.partner1 = fields.partner1;
  if ("partner1Email" in fields) data.partner1Email = fields.partner1Email;
  if ("partner1Phone" in fields) data.partner1Phone = fields.partner1Phone;
  if ("partner2" in fields) data.partner2 = fields.partner2;
  if ("partner2Email" in fields) data.partner2Email = fields.partner2Email;
  if ("partner2Phone" in fields) data.partner2Phone = fields.partner2Phone;
  if ("guestEstimate" in fields) data.guestEstimate = fields.guestEstimate;
  if ("notes" in fields) data.notes = fields.notes;
  return prisma.wedding.update({ where: { id }, data });
}
