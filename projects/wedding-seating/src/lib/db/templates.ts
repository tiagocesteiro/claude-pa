import type { LayoutTemplate } from "@prisma/client";
import { prisma } from "./client";

export function createTemplate(input: {
  venueId: string; floorPlanId?: string; name: string; minGuests: number; maxGuests: number; lines?: string;
}): Promise<LayoutTemplate> {
  return prisma.layoutTemplate.create({ data: input });
}
export function listTemplates(venueId: string): Promise<LayoutTemplate[]> {
  return prisma.layoutTemplate.findMany({ where: { venueId }, orderBy: { createdAt: "asc" } });
}
export function updateTemplate(id: string, patch: Partial<Pick<LayoutTemplate, "name" | "minGuests" | "maxGuests" | "lines">>): Promise<LayoutTemplate> {
  return prisma.layoutTemplate.update({ where: { id }, data: patch });
}
export async function deleteTemplate(id: string): Promise<void> {
  await prisma.layoutTemplate.delete({ where: { id } });
}
