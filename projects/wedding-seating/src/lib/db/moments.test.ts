import { describe, it, expect, afterAll } from "vitest";
import { setMomentFloorPlan, MOMENT_KINDS } from "./moments";
import { createWedding } from "./weddings";
import { prisma } from "./client";

it("setMomentFloorPlan upserts a moment's floor plan", async () => {
  const venue = await prisma.venue.create({ data: { name: "Moment Venue" } });
  const fp = await prisma.floorPlan.create({
    data: { venueId: venue.id, image: "img.png", scale: 50, width: 10, depth: 10 },
  });
  const w = await createWedding({ couple: "Moment Upsert", venueId: venue.id });

  const updated = await setMomentFloorPlan(w.id, "ceremony", fp.id);
  expect(updated?.floorPlanId).toBe(fp.id);

  const moments = await prisma.weddingMoment.findMany({ where: { weddingId: w.id } });
  expect(moments.length).toBe(4); // still 4 — upsert, not a duplicate row
  const ceremony = moments.find((m) => m.kind === "ceremony");
  expect(ceremony?.floorPlanId).toBe(fp.id);

  const cleared = await setMomentFloorPlan(w.id, "ceremony", null);
  expect(cleared?.floorPlanId).toBeNull();
});

it("setMomentFloorPlan rejects an invalid kind", async () => {
  const w = await createWedding({ couple: "Moment Bad Kind" });
  const result = await setMomentFloorPlan(w.id, "brunch", null);
  expect(result).toBeNull();
});

it("MOMENT_KINDS has exactly the four expected kinds", () => {
  expect([...MOMENT_KINDS].sort()).toEqual(["ceremony", "cocktail", "dance", "dinner"]);
});

afterAll(async () => { await prisma.$disconnect(); });
