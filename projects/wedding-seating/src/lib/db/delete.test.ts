import { it, expect } from "vitest";
import { createWedding, deleteWedding } from "./weddings";
import { createVenue, deleteVenue } from "./venues";
import { createFloorPlan, deleteFloorPlan } from "./floorplans";
import { createGroup } from "./groups";
import { prisma } from "./client";

it("deleteWedding removes the wedding and cascades its guests/groups/moments/tables", async () => {
  const w = await createWedding({ couple: "Zé & Ná" });
  const g = await createGroup({ weddingId: w.id, name: "Fam" });
  const guest = await prisma.guest.create({ data: { weddingId: w.id, name: "Ivo", groupId: g.id } });
  const table = await prisma.table.create({
    data: { weddingId: w.id, shape: "round", capacity: 8, x: 1, y: 1 },
  });

  await deleteWedding(w.id);

  expect(await prisma.wedding.findUnique({ where: { id: w.id } })).toBeNull();
  expect(await prisma.guest.findUnique({ where: { id: guest.id } })).toBeNull();
  expect(await prisma.group.findUnique({ where: { id: g.id } })).toBeNull();
  expect(await prisma.table.findUnique({ where: { id: table.id } })).toBeNull();
  // the 4 seeded moments are gone too
  expect(await prisma.weddingMoment.count({ where: { weddingId: w.id } })).toBe(0);
});

it("deleteVenue removes the venue and cascades its floor plans/table types/templates", async () => {
  const v = await createVenue({ name: "Quinta Teste" });
  const fp = await prisma.floorPlan.create({
    data: { venueId: v.id, image: "", scale: 0, width: 0, depth: 0 },
  });
  const tt = await prisma.tableType.create({
    data: { venueId: v.id, name: "Redonda", shape: "round", minSeats: 1, maxSeats: 8, width: 1.5, depth: 1.5 },
  });
  const tpl = await prisma.layoutTemplate.create({
    data: { venueId: v.id, floorPlanId: fp.id, name: "Base", minGuests: 0, maxGuests: 100 },
  });

  await deleteVenue(v.id);

  expect(await prisma.venue.findUnique({ where: { id: v.id } })).toBeNull();
  expect(await prisma.floorPlan.findUnique({ where: { id: fp.id } })).toBeNull();
  expect(await prisma.tableType.findUnique({ where: { id: tt.id } })).toBeNull();
  expect(await prisma.layoutTemplate.findUnique({ where: { id: tpl.id } })).toBeNull();
});

it("deleteFloorPlan removes the plan, its tables, and templates built on it", async () => {
  const v = await createVenue({ name: "Quinta FP" });
  const fp = await createFloorPlan({ venueId: v.id, image: "", scale: 0, width: 0, depth: 0, name: "Salão" });
  const tpl = await prisma.layoutTemplate.create({
    data: { venueId: v.id, floorPlanId: fp.id, name: "Arranjo", minGuests: 0, maxGuests: 100 },
  });
  const tplTable = await prisma.table.create({
    data: { templateId: tpl.id, shape: "round", capacity: 8, x: 1, y: 1 },
  });

  await deleteFloorPlan(fp.id);

  expect(await prisma.floorPlan.findUnique({ where: { id: fp.id } })).toBeNull();
  expect(await prisma.layoutTemplate.findUnique({ where: { id: tpl.id } })).toBeNull();
  expect(await prisma.table.findUnique({ where: { id: tplTable.id } })).toBeNull();
  // the venue itself survives
  expect(await prisma.venue.findUnique({ where: { id: v.id } })).not.toBeNull();
});

it("deleteVenue nulls venueId on weddings that referenced it (wedding survives)", async () => {
  const v = await createVenue({ name: "Quinta B" });
  const w = await createWedding({ couple: "A & B", venueId: v.id });

  await deleteVenue(v.id);

  const still = await prisma.wedding.findUnique({ where: { id: w.id } });
  expect(still).not.toBeNull();
  expect(still?.venueId).toBeNull();
});
