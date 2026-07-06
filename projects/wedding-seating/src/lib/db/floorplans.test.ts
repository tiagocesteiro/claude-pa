import { describe, it, expect, afterAll } from "vitest";
import { createFloorPlan, getFloorPlan, updateFloorPlanScale } from "./floorplans";
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

afterAll(async () => { await prisma.$disconnect(); });
