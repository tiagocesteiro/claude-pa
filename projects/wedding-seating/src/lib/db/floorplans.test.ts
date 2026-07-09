import { describe, it, expect, afterAll } from "vitest";
import { createFloorPlan, getFloorPlan, updateFloorPlanScale, updateFloorPlanBoundary } from "./floorplans";
import { createVenue } from "./venues";
import { prisma } from "./client";

it("creates a floor plan under a venue and updates scale", async () => {
  const v = await createVenue({ name: "Quinta FP" });
  const fp = await createFloorPlan({
    venueId: v.id,
    image: "data/uploads/x.jpg",
    scale: 50,
    width: 20,
    depth: 15,
  });
  expect(fp.venueId).toBe(v.id);
  const updated = await updateFloorPlanScale(fp.id, 75);
  expect(updated.scale).toBe(75);
  const got = await getFloorPlan(fp.id);
  expect(got?.scale).toBe(75);
});

it("stores and clears a floor plan boundary", async () => {
  const v = await createVenue({ name: "V Bound" });
  const fp = await createFloorPlan({ venueId: v.id, image: "x", scale: 50, width: 10, depth: 10 });
  const poly = JSON.stringify([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
  const updated = await updateFloorPlanBoundary(fp.id, poly);
  expect(JSON.parse(updated.boundary!)).toHaveLength(3);
  const cleared = await updateFloorPlanBoundary(fp.id, null);
  expect(cleared.boundary).toBeNull();
});

afterAll(async () => { await prisma.$disconnect(); });
