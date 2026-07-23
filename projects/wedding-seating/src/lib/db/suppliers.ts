import type { Supplier } from "@prisma/client";
import { prisma } from "./client";

/** Wedding suppliers (fornecedores) — added on the Detalhes page; assignable as a
 * task's responsible party. Wedding-owned; tenancy gated by the route. */

export function listSuppliers(weddingId: string): Promise<Supplier[]> {
  return prisma.supplier.findMany({ where: { weddingId }, orderBy: { createdAt: "asc" } });
}

export function getSupplier(id: string): Promise<Supplier | null> {
  return prisma.supplier.findUnique({ where: { id } });
}

/** An existing slot in the wedding with the same name (case-insensitive) and the
 * same service — used to prevent creating duplicate supplier slots. */
export function findDuplicateSupplier(
  weddingId: string,
  name: string,
  service: string | null
): Promise<Supplier | null> {
  return prisma.supplier.findFirst({
    where: {
      weddingId,
      name: { equals: name, mode: "insensitive" },
      service: service ?? null,
    },
  });
}

export function createSupplier(
  weddingId: string,
  input: { name: string; service?: string | null; contact?: string | null }
): Promise<Supplier> {
  return prisma.supplier.create({
    data: {
      weddingId,
      name: input.name,
      service: input.service ?? null,
      contact: input.contact ?? null,
    },
  });
}

export function updateSupplier(
  id: string,
  fields: { name?: string; service?: string | null; contact?: string | null }
): Promise<Supplier> {
  const data: Record<string, unknown> = {};
  if ("name" in fields) data.name = fields.name;
  if ("service" in fields) data.service = fields.service;
  if ("contact" in fields) data.contact = fields.contact;
  return prisma.supplier.update({ where: { id }, data });
}

export function deleteSupplier(id: string): Promise<Supplier> {
  return prisma.supplier.delete({ where: { id } });
}
