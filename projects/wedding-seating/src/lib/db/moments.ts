import type { WeddingMoment } from "@prisma/client";
import { prisma } from "./client";

export const MOMENT_KINDS = ["ceremony", "cocktail", "dinner", "dance"] as const;
export type MomentKind = (typeof MOMENT_KINDS)[number];

/** Portuguese labels for the seeded default kinds — used to seed each moment's
 * `title` and as the display fallback when `title` is null. */
export const MOMENT_LABELS: Record<MomentKind, string> = {
  ceremony: "Cerimónia",
  cocktail: "Cocktail",
  dinner: "Jantar",
  dance: "Dança",
};

export function isMomentKind(value: unknown): value is MomentKind {
  return typeof value === "string" && (MOMENT_KINDS as readonly string[]).includes(value);
}

/** The default moments seeded on wedding creation (kept editable/removable).
 * Only the dinner has a seating plan by default. */
export function defaultMomentSeed(weddingId: string) {
  return MOMENT_KINDS.map((kind, i) => ({
    weddingId,
    kind,
    title: MOMENT_LABELS[kind],
    order: i,
    hasSeating: kind === "dinner",
  }));
}

// ── Dynamic (id-based) API — the new model ───────────────────────────────────

/** All moments for a wedding, in tab order. */
export function listMoments(weddingId: string): Promise<WeddingMoment[]> {
  return prisma.weddingMoment.findMany({
    where: { weddingId },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });
}

export function getMoment(momentId: string): Promise<WeddingMoment | null> {
  return prisma.weddingMoment.findUnique({ where: { id: momentId } });
}

/** Create a custom moment at the end of the list (kind stays null — a custom moment). */
export async function createMoment(weddingId: string, title: string): Promise<WeddingMoment> {
  const last = await prisma.weddingMoment.findFirst({
    where: { weddingId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;
  return prisma.weddingMoment.create({ data: { weddingId, title, order } });
}

/** Whitelisted moment update (rename / reorder / arrangement). Only the fields
 * present are written; venue-match on template/floorPlan is enforced by the route. */
export function updateMoment(
  momentId: string,
  fields: {
    title?: string;
    order?: number;
    templateId?: string | null;
    floorPlanId?: string | null;
    hasSeating?: boolean;
  }
): Promise<WeddingMoment> {
  const data: Record<string, unknown> = {};
  if ("title" in fields) data.title = fields.title;
  if ("order" in fields) data.order = fields.order;
  if ("templateId" in fields) data.templateId = fields.templateId;
  if ("floorPlanId" in fields) data.floorPlanId = fields.floorPlanId;
  if ("hasSeating" in fields) data.hasSeating = fields.hasSeating;
  return prisma.weddingMoment.update({ where: { id: momentId }, data });
}

export function deleteMoment(momentId: string): Promise<WeddingMoment> {
  return prisma.weddingMoment.delete({ where: { id: momentId } });
}

// ── Legacy (kind-based) API — kept working through the transition ─────────────
// The old Detalhes UI + `/moments/[kind]` route still call these. Since the
// (weddingId,kind) unique index was dropped, they resolve the seeded moment by
// findFirst and update by id (creating it if somehow missing), instead of upsert.

async function upsertByKind(
  weddingId: string,
  kind: MomentKind,
  data: { floorPlanId?: string | null; templateId?: string | null; notes?: string | null }
): Promise<WeddingMoment> {
  const existing = await prisma.weddingMoment.findFirst({
    where: { weddingId, kind },
    select: { id: true },
  });
  if (existing) return prisma.weddingMoment.update({ where: { id: existing.id }, data });
  return prisma.weddingMoment.create({
    data: { weddingId, kind, title: MOMENT_LABELS[kind], ...data },
  });
}

export function setMomentFloorPlan(
  weddingId: string,
  kind: string,
  floorPlanId: string | null
): Promise<WeddingMoment> | null {
  if (!isMomentKind(kind)) return null;
  return upsertByKind(weddingId, kind, { floorPlanId });
}

export function setMomentTemplate(
  weddingId: string,
  kind: string,
  templateId: string | null
): Promise<WeddingMoment> | null {
  if (!isMomentKind(kind)) return null;
  return upsertByKind(weddingId, kind, { templateId });
}

export function setMomentNotes(
  weddingId: string,
  kind: string,
  notes: string | null
): Promise<WeddingMoment> | null {
  if (!isMomentKind(kind)) return null;
  return upsertByKind(weddingId, kind, { notes });
}
