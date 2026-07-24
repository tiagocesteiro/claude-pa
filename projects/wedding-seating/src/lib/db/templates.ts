import type { LayoutTemplate } from "@prisma/client";
import { prisma } from "./client";

export function createTemplate(input: {
  venueId: string; floorPlanId?: string; spaceId?: string | null; name: string; minGuests: number; maxGuests: number; lines?: string;
}): Promise<LayoutTemplate> {
  return prisma.layoutTemplate.create({ data: input });
}
export function listTemplates(venueId: string): Promise<LayoutTemplate[]> {
  return prisma.layoutTemplate.findMany({ where: { venueId }, orderBy: { createdAt: "asc" } });
}
export function updateTemplate(id: string, patch: Partial<Pick<LayoutTemplate, "name" | "minGuests" | "maxGuests" | "lines" | "floorPlanId" | "spaceId">>): Promise<LayoutTemplate> {
  return prisma.layoutTemplate.update({ where: { id }, data: patch });
}
export async function deleteTemplate(id: string): Promise<void> {
  await prisma.layoutTemplate.delete({ where: { id } });
}

/** Example photos (Storage object paths) for a template, parsed from its JSON column. */
export async function getTemplatePhotos(id: string): Promise<string[]> {
  const tpl = await prisma.layoutTemplate.findUnique({ where: { id }, select: { photos: true } });
  return parsePhotos(tpl?.photos ?? null);
}

export function setTemplatePhotos(id: string, photos: string[]): Promise<LayoutTemplate> {
  return prisma.layoutTemplate.update({
    where: { id },
    data: { photos: photos.length ? JSON.stringify(photos) : null },
  });
}

/** Safe parse of the photos JSON column → string[] (never throws). */
export function parsePhotos(json: string | null): string[] {
  if (!json) return [];
  try {
    const p = JSON.parse(json);
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
