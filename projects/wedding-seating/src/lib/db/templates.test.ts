import { describe, it, expect, afterAll } from "vitest";
import {
  createTemplate,
  listTemplates,
  updateTemplate,
  deleteTemplate,
  getTemplatePhotos,
  setTemplatePhotos,
  parsePhotos,
} from "./templates";
import { prisma } from "./client";

it("template example photos round-trip (add + remove)", async () => {
  const v = await prisma.venue.create({ data: { name: "V Photos" } });
  const t = await createTemplate({ venueId: v.id, name: "P", minGuests: 40, maxGuests: 80 });
  expect(await getTemplatePhotos(t.id)).toEqual([]);

  await setTemplatePhotos(t.id, ["tpl-x/a.jpg", "tpl-x/b.jpg"]);
  expect(await getTemplatePhotos(t.id)).toEqual(["tpl-x/a.jpg", "tpl-x/b.jpg"]);

  await setTemplatePhotos(t.id, ["tpl-x/a.jpg"]);
  expect(await getTemplatePhotos(t.id)).toEqual(["tpl-x/a.jpg"]);

  // Empty list clears the column back to null.
  await setTemplatePhotos(t.id, []);
  const row = await prisma.layoutTemplate.findUnique({ where: { id: t.id }, select: { photos: true } });
  expect(row?.photos).toBeNull();

  expect(parsePhotos(null)).toEqual([]);
  expect(parsePhotos("not json")).toEqual([]);
  expect(parsePhotos(JSON.stringify(["x", 3, "y"]))).toEqual(["x", "y"]);
});

it("CRUDs layout templates for a venue", async () => {
  const v = await prisma.venue.create({ data: { name: "V Tpl" } });
  const lines = JSON.stringify([{ tableTypeId: "tt1", quantity: 10 }]);
  const t = await createTemplate({ venueId: v.id, name: "80-100", minGuests: 80, maxGuests: 100, lines });
  expect(JSON.parse(t.lines!)).toHaveLength(1);
  const upd = await updateTemplate(t.id, { maxGuests: 110 });
  expect(upd.maxGuests).toBe(110);
  expect((await listTemplates(v.id)).length).toBe(1);
  await deleteTemplate(t.id);
  expect((await listTemplates(v.id)).length).toBe(0);
});

afterAll(async () => { await prisma.$disconnect(); });
