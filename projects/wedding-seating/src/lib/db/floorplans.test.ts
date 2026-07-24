import { describe, it, expect, afterAll } from "vitest";
import { createFloorPlan, getFloorPlan, updateFloorPlanScale, updateFloorPlanBoundary, updateFloorPlanZones, updateFloorPlanSpace } from "./floorplans";
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

it("stores and clears a floor plan's zones", async () => {
  const v = await createVenue({ name: "V Zones" });
  const fp = await createFloorPlan({ venueId: v.id, image: "x", scale: 50, width: 10, depth: 10 });
  const zones = JSON.stringify([{ name: "Family", points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }] }]);
  const updated = await updateFloorPlanZones(fp.id, zones);
  expect(JSON.parse(updated.zones!)).toHaveLength(1);
  const cleared = await updateFloorPlanZones(fp.id, null);
  expect(cleared.zones).toBeNull();
});

it("a floor plan can belong to a venue space", async () => {
  const v = await createVenue({ name: "Quinta FP Space" });
  const space = await prisma.venueSpace.create({ data: { venueId: v.id, name: "Salão" } });
  const fp = await createFloorPlan({ venueId: v.id, spaceId: space.id, image: "", scale: 0, width: 0, depth: 0 });
  expect(fp.spaceId).toBe(space.id);

  // Recover an orphan plan by assigning it a space (and clearing it).
  const orphan = await createFloorPlan({ venueId: v.id, image: "", scale: 0, width: 0, depth: 0 });
  expect(orphan.spaceId).toBeNull();
  expect((await updateFloorPlanSpace(orphan.id, space.id)).spaceId).toBe(space.id);
  expect((await updateFloorPlanSpace(orphan.id, null)).spaceId).toBeNull();
});

afterAll(async () => { await prisma.$disconnect(); });
