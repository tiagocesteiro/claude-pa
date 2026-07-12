import { describe, it, expect, afterAll } from "vitest";
import { listWeddingTables, applyTemplateToWedding, saveWeddingTables } from "./weddingTables";
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

describe("saveWeddingTables", () => {
  it("moving/adding a table (all ids kept) round-trips and never touches seated guests", async () => {
    const w = await prisma.wedding.create({ data: { couple: "Save WT" } });
    const t1 = await prisma.table.create({
      data: { weddingId: w.id, shape: "round", capacity: 8, x: 10, y: 10, fixed: false },
    });
    const t2 = await prisma.table.create({
      data: { weddingId: w.id, shape: "round", capacity: 8, x: 50, y: 50, fixed: false },
    });
    const seated = await prisma.guest.create({
      data: { weddingId: w.id, name: "Seated", assignedTableId: t1.id },
    });

    // move t1, keep t2 as-is, add a brand new table
    await saveWeddingTables(w.id, [
      { id: t1.id, shape: "round", capacity: 8, x: 999, y: 999, fixed: false },
      { id: t2.id, shape: "round", capacity: 8, x: 50, y: 50, fixed: false },
      { shape: "rect", capacity: 10, x: 200, y: 200, fixed: false, width: 2, depth: 1 },
    ]);

    const tables = await listWeddingTables(w.id);
    expect(tables.length).toBe(3);
    const moved = tables.find((t) => t.id === t1.id);
    expect(moved?.x).toBe(999);
    expect(moved?.y).toBe(999);
    expect(tables.some((t) => t.id === t2.id)).toBe(true);
    expect(tables.some((t) => t.shape === "rect" && t.width === 2)).toBe(true);

    // the guest seated at t1 (moved, not removed) keeps its assignment
    const guest = await prisma.guest.findUnique({ where: { id: seated.id } });
    expect(guest?.assignedTableId).toBe(t1.id);
  });

  it("removing a table unassigns only that table's guests, leaving other seats intact", async () => {
    const w = await prisma.wedding.create({ data: { couple: "Save WT Remove" } });
    const kept = await prisma.table.create({
      data: { weddingId: w.id, shape: "round", capacity: 8, x: 10, y: 10, fixed: false },
    });
    const removed = await prisma.table.create({
      data: { weddingId: w.id, shape: "round", capacity: 8, x: 50, y: 50, fixed: false },
    });
    const guestOnKept = await prisma.guest.create({
      data: { weddingId: w.id, name: "Kept", assignedTableId: kept.id },
    });
    const guestOnRemoved = await prisma.guest.create({
      data: { weddingId: w.id, name: "Removed", assignedTableId: removed.id },
    });

    // send back only `kept` — `removed` is dropped from the set
    await saveWeddingTables(w.id, [
      { id: kept.id, shape: "round", capacity: 8, x: 10, y: 10, fixed: false },
    ]);

    const tables = await listWeddingTables(w.id);
    expect(tables.length).toBe(1);
    expect(tables[0].id).toBe(kept.id);

    const guest1 = await prisma.guest.findUnique({ where: { id: guestOnKept.id } });
    expect(guest1?.assignedTableId).toBe(kept.id);
    const guest2 = await prisma.guest.findUnique({ where: { id: guestOnRemoved.id } });
    expect(guest2?.assignedTableId).toBeNull();
  });
});

afterAll(async () => { await prisma.$disconnect(); });
