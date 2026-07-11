import { describe, it, expect, afterAll } from "vitest";
import { createTemplate, listTemplates, updateTemplate, deleteTemplate } from "./templates";
import { prisma } from "./client";

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
