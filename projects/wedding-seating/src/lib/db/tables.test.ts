import { describe, it, expect, afterAll } from "vitest";
import { saveTables, listTables } from "./tables";
import { createFloorPlan } from "./floorplans";
import { createVenue } from "./venues";
import { prisma } from "./client";

it("saveTables replaces the whole layout idempotently", async () => {
  const v = await createVenue({ name: "Quinta T" });
  const fp = await createFloorPlan({ venueId: v.id, image: "x.jpg", scale: 50, width: 10, depth: 10 });

  await saveTables(fp.id, [
    { shape: "round", capacity: 8, x: 100, y: 100, fixed: false },
    { shape: "rect", capacity: 10, x: 200, y: 150, fixed: true },
  ]);
  expect((await listTables(fp.id)).length).toBe(2);

  // Saving again with one table must REPLACE, not append.
  await saveTables(fp.id, [{ shape: "round", capacity: 6, x: 50, y: 50, fixed: false }]);
  const after = await listTables(fp.id);
  expect(after.length).toBe(1);
  expect(after[0].capacity).toBe(6);
});

afterAll(async () => { await prisma.$disconnect(); });
