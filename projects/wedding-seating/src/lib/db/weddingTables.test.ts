import { describe, it, expect, afterAll } from "vitest";
import { listWeddingTables, applyTemplateToWedding } from "./weddingTables";
import { prisma } from "./client";

it("copies a template's tables into the wedding and points the wedding at the layout", async () => {
  const v = await prisma.venue.create({ data: { name: "V WT" } });
  const fp = await prisma.floorPlan.create({ data: { venueId: v.id, image: "img", scale: 50, width: 10, depth: 10 } });
  const t = await prisma.layoutTemplate.create({ data: { venueId: v.id, floorPlanId: fp.id, name: "T", minGuests: 80, maxGuests: 100, lines: "[]" } });
  await prisma.table.createMany({ data: [
    { templateId: t.id, shape: "round", capacity: 8, x: 100, y: 100, fixed: false, width: 1.5, depth: 1.5 },
    { templateId: t.id, shape: "rect", capacity: 10, x: 200, y: 150, fixed: false, width: 2.4, depth: 1 },
  ]});
  const w = await prisma.wedding.create({ data: { couple: "Apply Test" } });
  const g = await prisma.guest.create({ data: { weddingId: w.id, name: "A", assignedTableId: "stale" } });

  const res = await applyTemplateToWedding(w.id, t.id);
  expect(res.copied).toBe(2);
  const wt = await listWeddingTables(w.id);
  expect(wt.length).toBe(2);
  expect(wt.every((x) => x.weddingId === w.id && x.templateId === null)).toBe(true);
  const wedding = await prisma.wedding.findUnique({ where: { id: w.id } });
  expect(wedding?.floorPlanId).toBe(fp.id);
  expect(wedding?.templateId).toBe(t.id);
  const guest = await prisma.guest.findUnique({ where: { id: g.id } });
  expect(guest?.assignedTableId).toBeNull();

  // applying again replaces (still 2, not 4)
  await applyTemplateToWedding(w.id, t.id);
  expect((await listWeddingTables(w.id)).length).toBe(2);
});

afterAll(async () => { await prisma.$disconnect(); });
