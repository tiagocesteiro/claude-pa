import type { WeddingService } from "@prisma/client";
import { prisma } from "./client";

/**
 * The wedding's responsibility matrix (WeddingService): the services it needs and
 * who provides each (venue in-house / external supplier slot / couple). Venue-
 * managed; tenancy gated by the routes. See `assertServiceAccess` in access.ts.
 */

export type ProviderType = "venue" | "supplier" | "couple";

/** The service kinds the matrix understands. `other` covers anything bespoke. */
export const SERVICE_KINDS = [
  "catering",
  "dj",
  "band",
  "photo",
  "video",
  "decor",
  "flowers",
  "cake",
  "transport",
  "other",
] as const;

export function listServices(weddingId: string): Promise<WeddingService[]> {
  return prisma.weddingService.findMany({ where: { weddingId }, orderBy: { createdAt: "asc" } });
}

export function getService(id: string): Promise<WeddingService | null> {
  return prisma.weddingService.findUnique({ where: { id } });
}

export function addService(
  weddingId: string,
  input: {
    kind: string;
    name?: string | null;
    providerType?: ProviderType;
    supplierId?: string | null;
    note?: string | null;
  }
): Promise<WeddingService> {
  const providerType = input.providerType ?? "venue";
  return prisma.weddingService.create({
    data: {
      weddingId,
      kind: input.kind,
      name: input.name ?? null,
      providerType,
      // A supplier slot only makes sense when an external supplier provides it.
      supplierId: providerType === "supplier" ? input.supplierId ?? null : null,
      note: input.note ?? null,
    },
  });
}

export function updateService(
  id: string,
  fields: {
    kind?: string;
    name?: string | null;
    providerType?: ProviderType;
    supplierId?: string | null;
    status?: string;
    note?: string | null;
  }
): Promise<WeddingService> {
  const data: Record<string, unknown> = {};
  if ("kind" in fields) data.kind = fields.kind;
  if ("name" in fields) data.name = fields.name;
  if ("providerType" in fields) {
    data.providerType = fields.providerType;
    // Clear the supplier link when the provider is no longer an external supplier.
    if (fields.providerType !== "supplier") data.supplierId = null;
  }
  // Apply an explicit supplierId unless we just cleared it (provider left "supplier").
  if ("supplierId" in fields && data.supplierId === undefined) {
    data.supplierId = fields.supplierId ?? null;
  }
  if ("status" in fields) data.status = fields.status;
  if ("note" in fields) data.note = fields.note;
  return prisma.weddingService.update({ where: { id }, data });
}

export function deleteService(id: string): Promise<WeddingService> {
  return prisma.weddingService.delete({ where: { id } });
}
