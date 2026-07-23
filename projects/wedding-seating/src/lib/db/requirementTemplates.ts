import type { RequirementTemplate, Prisma } from "@prisma/client";
import { prisma } from "./client";
import type { RequirementData } from "./requirements";

/**
 * A venue's reusable request/instruction templates. Venue-owned (tenancy gated by
 * the routes via the venue). Applied to a wedding = each chosen template becomes a
 * WeddingRequirement addressed to the matching supplier (see the apply route).
 */

/** Venue's templates (ownerRole "venue"). */
export function listRequirementTemplates(venueId: string): Promise<RequirementTemplate[]> {
  return prisma.requirementTemplate.findMany({
    where: { venueId, ownerRole: "venue" },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

/** A supplier account's templates (ownerRole "supplier"). */
export function listSupplierTemplates(profileId: string): Promise<RequirementTemplate[]> {
  return prisma.requirementTemplate.findMany({
    where: { supplierProfileId: profileId, ownerRole: "supplier" },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export function getRequirementTemplate(id: string): Promise<RequirementTemplate | null> {
  return prisma.requirementTemplate.findUnique({ where: { id } });
}

export function createVenueTemplate(
  venueId: string,
  input: { kind?: string; service?: string | null; title: string; detail?: string | null; data?: RequirementData | null; order?: number }
): Promise<RequirementTemplate> {
  const data = input.data && Object.keys(input.data).length > 0 ? input.data : undefined;
  return prisma.requirementTemplate.create({
    data: {
      ownerRole: "venue",
      venueId,
      kind: input.kind === "question" ? "question" : "request",
      service: input.service ?? null,
      title: input.title,
      detail: input.detail ?? null,
      data: data as Prisma.InputJsonValue | undefined,
      order: input.order ?? 0,
    },
  });
}

export function createSupplierTemplate(
  profileId: string,
  input: { kind?: string; targetRole?: string | null; title: string; detail?: string | null; data?: RequirementData | null; order?: number }
): Promise<RequirementTemplate> {
  const data = input.data && Object.keys(input.data).length > 0 ? input.data : undefined;
  return prisma.requirementTemplate.create({
    data: {
      ownerRole: "supplier",
      supplierProfileId: profileId,
      kind: input.kind === "question" ? "question" : "request",
      targetRole: input.targetRole === "couple" ? "couple" : "venue",
      title: input.title,
      detail: input.detail ?? null,
      data: data as Prisma.InputJsonValue | undefined,
      order: input.order ?? 0,
    },
  });
}

export function updateRequirementTemplate(
  id: string,
  fields: { kind?: string; service?: string | null; targetRole?: string | null; title?: string; detail?: string | null; data?: RequirementData | null; order?: number }
): Promise<RequirementTemplate> {
  const data: Prisma.RequirementTemplateUpdateInput = {};
  if ("kind" in fields) data.kind = fields.kind === "question" ? "question" : "request";
  if ("service" in fields) data.service = fields.service ?? null;
  if ("targetRole" in fields) data.targetRole = fields.targetRole ?? null;
  if ("title" in fields) data.title = fields.title;
  if ("detail" in fields) data.detail = fields.detail;
  if ("data" in fields) data.data = (fields.data ?? undefined) as Prisma.InputJsonValue | undefined;
  if ("order" in fields) data.order = fields.order;
  return prisma.requirementTemplate.update({ where: { id }, data });
}

export function deleteRequirementTemplate(id: string): Promise<RequirementTemplate> {
  return prisma.requirementTemplate.delete({ where: { id } });
}
