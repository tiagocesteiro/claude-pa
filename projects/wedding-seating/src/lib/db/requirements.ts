import { prisma } from "./client";
import type { Prisma } from "@prisma/client";

/**
 * The interactions ledger (WeddingRequirement) — structured needs/agreements
 * between the parties, with an open→agreed→done lifecycle and a lightweight
 * comment thread. Venue-coordinated; suppliers see only their slice (see
 * `assertRequirementAccess` in access.ts). Tenancy gated by the routes.
 */

export type RequirementStatus = "open" | "agreed" | "done";
export const REQUIREMENT_STATUSES: RequirementStatus[] = ["open", "agreed", "done"];

const withRelations = {
  comments: { orderBy: { createdAt: "asc" } },
  service: { select: { kind: true, name: true } },
  moment: { select: { title: true, kind: true } },
} satisfies Prisma.WeddingRequirementInclude;

export type RequirementWithRelations = Prisma.WeddingRequirementGetPayload<{ include: typeof withRelations }>;

/** How to scope a requirements listing. `all` = venue/couple/admin (everything);
 * `supplier` = only rows the supplier raised, that target their slot, or that
 * concern a service they provide. */
export type RequirementScope =
  | { kind: "all" }
  | { kind: "supplier"; supplierId: string | null; profileId: string };

function scopeWhere(weddingId: string, scope: RequirementScope): Prisma.WeddingRequirementWhereInput {
  if (scope.kind === "all") return { weddingId };
  const or: Prisma.WeddingRequirementWhereInput[] = [{ fromProfileId: scope.profileId }];
  if (scope.supplierId) {
    or.push({ toSupplierId: scope.supplierId }, { service: { supplierId: scope.supplierId } });
  }
  return { weddingId, OR: or };
}

export function listRequirements(weddingId: string, scope: RequirementScope): Promise<RequirementWithRelations[]> {
  return prisma.weddingRequirement.findMany({
    where: scopeWhere(weddingId, scope),
    orderBy: { createdAt: "desc" },
    include: withRelations,
  });
}

export function getRequirement(id: string): Promise<RequirementWithRelations | null> {
  return prisma.weddingRequirement.findUnique({ where: { id }, include: withRelations });
}

export function createRequirement(
  weddingId: string,
  input: {
    title: string;
    fromRole: string;
    fromProfileId?: string | null;
    toRole?: string | null;
    toSupplierId?: string | null;
    momentId?: string | null;
    serviceId?: string | null;
    detail?: string | null;
  }
): Promise<RequirementWithRelations> {
  return prisma.weddingRequirement.create({
    data: {
      weddingId,
      title: input.title,
      fromRole: input.fromRole,
      fromProfileId: input.fromProfileId ?? null,
      toRole: input.toRole ?? null,
      toSupplierId: input.toSupplierId ?? null,
      momentId: input.momentId ?? null,
      serviceId: input.serviceId ?? null,
      detail: input.detail ?? null,
    },
    include: withRelations,
  });
}

export function updateRequirement(
  id: string,
  fields: {
    title?: string;
    detail?: string | null;
    status?: RequirementStatus;
    toRole?: string | null;
    toSupplierId?: string | null;
    momentId?: string | null;
    serviceId?: string | null;
  }
): Promise<RequirementWithRelations> {
  const data: Prisma.WeddingRequirementUpdateInput = {};
  if ("title" in fields) data.title = fields.title;
  if ("detail" in fields) data.detail = fields.detail;
  if ("status" in fields) data.status = fields.status;
  if ("toRole" in fields) data.toRole = fields.toRole;
  if ("toSupplierId" in fields) data.toSupplierId = fields.toSupplierId;
  if ("momentId" in fields) data.moment = fields.momentId ? { connect: { id: fields.momentId } } : { disconnect: true };
  if ("serviceId" in fields) data.service = fields.serviceId ? { connect: { id: fields.serviceId } } : { disconnect: true };
  return prisma.weddingRequirement.update({ where: { id }, data, include: withRelations });
}

export function deleteRequirement(id: string): Promise<{ id: string }> {
  return prisma.weddingRequirement.delete({ where: { id }, select: { id: true } });
}

export function addComment(
  requirementId: string,
  input: { authorRole: string; authorProfileId?: string | null; text: string }
) {
  return prisma.weddingRequirementComment.create({
    data: {
      requirementId,
      authorRole: input.authorRole,
      authorProfileId: input.authorProfileId ?? null,
      text: input.text,
    },
  });
}
