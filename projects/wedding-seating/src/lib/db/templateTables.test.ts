import { describe, it, expect, afterAll } from "vitest";
import { saveTemplateTables, listTemplateTables } from "./templateTables";
import { prisma } from "./client";

it("saves and lists a template's positioned tables (replace)", async () => {
  const v = await prisma.venue.create({ data: { name: "V TT" } });
  const fp = await prisma.floorPlan.create({ data: { venueId: v.id, image: "x", scale: 50, width: 10, depth: 10 } });
  const t = await prisma.layoutTemplate.create({ data: { venueId: v.id, floorPlanId: fp.id, name: "T", minGuests: 80, maxGuests: 100, lines: "[]" } });
  await saveTemplateTables(t.id, [
    { shape: "round", capacity: 8, x: 100, y: 100, fixed: false, width: 1.5, depth: 1.5 },
    { shape: "oval", capacity: 10, x: 200, y: 150, fixed: false, width: 1.8, depth: 1.2 },
  ]);
  expect((await listTemplateTables(t.id)).length).toBe(2);
  await saveTemplateTables(t.id, [{ shape: "rect", capacity: 6, x: 50, y: 50, fixed: false, width: 2.4, depth: 1 }]);
  const after = await listTemplateTables(t.id);
  expect(after.length).toBe(1);
  expect(after[0].shape).toBe("rect");
});

afterAll(async () => { await prisma.$disconnect(); });
