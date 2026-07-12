import type { WeddingMoment } from "@prisma/client";
import { prisma } from "./client";

export const MOMENT_KINDS = ["ceremony", "cocktail", "dinner", "dance"] as const;
export type MomentKind = (typeof MOMENT_KINDS)[number];

export function isMomentKind(value: unknown): value is MomentKind {
  return typeof value === "string" && (MOMENT_KINDS as readonly string[]).includes(value);
}

/** Upserts a moment's floor plan by (weddingId, kind). Returns null if kind is invalid
 * (callers — typically API routes — should treat that as a 400). */
export function setMomentFloorPlan(
  weddingId: string,
  kind: string,
  floorPlanId: string | null
): Promise<WeddingMoment> | null {
  if (!isMomentKind(kind)) return null;
  return prisma.weddingMoment.upsert({
    where: { weddingId_kind: { weddingId, kind } },
    create: { weddingId, kind, floorPlanId },
    update: { floorPlanId },
  });
}
