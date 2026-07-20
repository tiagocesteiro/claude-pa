import { it, expect, afterAll } from "vitest";
import {
  listLayouts,
  getFinalLayout,
  getLayout,
  createLayoutFromTemplate,
  createBlankLayout,
  setFinalLayout,
  deleteLayout,
  renameLayout,
  listLayoutTables,
  saveLayoutTables,
  getLayoutSeats,
  saveLayoutAssignment,
  clearLayoutSeats,
  saveLayoutElements,
} from "./layouts";
import { createWedding } from "./weddings";
import { prisma } from "./client";

/** Seed a venue with a floor plan + a template that has `n` positioned tables. */
async function seedTemplate(n = 3) {
  const v = await prisma.venue.create({ data: { name: "V Layouts" } });
  const fp = await prisma.floorPlan.create({
    data: { venueId: v.id, image: "img", scale: 50, width: 12, depth: 10 },
  });
  const tpl = await prisma.layoutTemplate.create({
    data: { venueId: v.id, floorPlanId: fp.id, name: "T", minGuests: 40, maxGuests: 120 },
  });
  for (let i = 0; i < n; i++) {
    await prisma.table.create({
      data: { templateId: tpl.id, shape: "round", capacity: 8, x: 100 + i * 60, y: 100, fixed: false },
    });
  }
  return { venueId: v.id, floorPlanId: fp.id, templateId: tpl.id };
}

/** A wedding + its first seeded moment id (layouts are moment-scoped). */
async function weddingMoment(couple: string, venueId?: string) {
  const w = await createWedding({ couple, venueId });
  const moment = await prisma.weddingMoment.findFirstOrThrow({
    where: { weddingId: w.id },
    orderBy: { order: "asc" },
  });
  return { wedding: w, momentId: moment.id };
}

it("createLayoutFromTemplate copies the template's tables + adopts its floor plan", async () => {
  const { venueId, floorPlanId, templateId } = await seedTemplate(3);
  const { momentId } = await weddingMoment("From Template", venueId);

  const layout = await createLayoutFromTemplate(momentId, templateId, "Principal");

  expect(layout.floorPlanId).toBe(floorPlanId);
  expect(layout.templateId).toBe(templateId);
  expect(layout.momentId).toBe(momentId);
  const tables = await listLayoutTables(layout.id);
  expect(tables.length).toBe(3);
  expect(tables.every((t) => t.weddingLayoutId === layout.id)).toBe(true);
  const tplTables = await prisma.table.findMany({ where: { templateId } });
  const tplIds = new Set(tplTables.map((t) => t.id));
  expect(tables.every((t) => !tplIds.has(t.id))).toBe(true);
});

it("the first layout of a moment becomes final; later ones do not", async () => {
  const { momentId } = await weddingMoment("First Final");
  const a = await createBlankLayout(momentId, { name: "A", width: 10, depth: 8, scale: 50 });
  const b = await createBlankLayout(momentId, { name: "B", width: 10, depth: 8, scale: 50 });

  expect(a.isFinal).toBe(true);
  expect(b.isFinal).toBe(false);
  expect((await getFinalLayout(momentId))?.id).toBe(a.id);
});

it("setFinalLayout marks exactly one, scoped to the moment", async () => {
  const { momentId } = await weddingMoment("Set Final");
  const a = await createBlankLayout(momentId, { name: "A", width: 10, depth: 8, scale: 50 });
  const b = await createBlankLayout(momentId, { name: "B", width: 10, depth: 8, scale: 50 });

  await setFinalLayout(momentId, b.id);
  const list = await listLayouts(momentId);
  expect(list.find((l) => l.id === a.id)?.isFinal).toBe(false);
  expect(list.find((l) => l.id === b.id)?.isFinal).toBe(true);
  expect(list.filter((l) => l.isFinal).length).toBe(1);

  // A layout id from ANOTHER moment must not flip this moment's flags.
  const other = await weddingMoment("Other");
  const oLayout = await createBlankLayout(other.momentId, { name: "O", width: 5, depth: 5, scale: 50 });
  await setFinalLayout(momentId, oLayout.id); // no-op
  const list2 = await listLayouts(momentId);
  expect(list2.find((l) => l.id === b.id)?.isFinal).toBe(true);
});

it("seating is independent per layout — same guest, different tables", async () => {
  const { wedding, momentId } = await weddingMoment("Per-layout seating");
  const g = await prisma.guest.create({ data: { weddingId: wedding.id, name: "Ana" } });
  const la = await createBlankLayout(momentId, { name: "A", width: 10, depth: 8, scale: 50 });
  const lb = await createBlankLayout(momentId, { name: "B", width: 10, depth: 8, scale: 50 });
  const ta = await prisma.table.create({
    data: { weddingLayoutId: la.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  const tb = await prisma.table.create({
    data: { weddingLayoutId: lb.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });

  await saveLayoutAssignment(la.id, [{ guestId: g.id, tableId: ta.id }]);
  await saveLayoutAssignment(lb.id, [{ guestId: g.id, tableId: tb.id }]);

  expect((await getLayoutSeats(la.id))[0].tableId).toBe(ta.id);
  expect((await getLayoutSeats(lb.id))[0].tableId).toBe(tb.id);
});

it("saveLayoutAssignment ignores foreign guests and foreign tables (tenancy)", async () => {
  const { wedding, momentId } = await weddingMoment("Mine");
  const other = await weddingMoment("Other");
  const mine = await createBlankLayout(momentId, { name: "M", width: 10, depth: 8, scale: 50 });
  const otherLayout = await createBlankLayout(other.momentId, { name: "O", width: 10, depth: 8, scale: 50 });
  const myGuest = await prisma.guest.create({ data: { weddingId: wedding.id, name: "Meu" } });
  const foreignGuest = await prisma.guest.create({ data: { weddingId: other.wedding.id, name: "Alheio" } });
  const myTable = await prisma.table.create({
    data: { weddingLayoutId: mine.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  const foreignTable = await prisma.table.create({
    data: { weddingLayoutId: otherLayout.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });

  await saveLayoutAssignment(mine.id, [
    { guestId: myGuest.id, tableId: myTable.id },
    { guestId: foreignGuest.id, tableId: myTable.id },
    { guestId: myGuest.id, tableId: foreignTable.id },
  ]);

  const seats = await getLayoutSeats(mine.id);
  expect(seats).toHaveLength(1);
  expect(seats[0].guestId).toBe(myGuest.id);
  expect(seats[0].tableId).toBe(myTable.id);
});

it("removing a table from a layout drops its seats (cascade)", async () => {
  const { wedding, momentId } = await weddingMoment("Remove Table");
  const g = await prisma.guest.create({ data: { weddingId: wedding.id, name: "Zé" } });
  const layout = await createBlankLayout(momentId, { name: "L", width: 10, depth: 8, scale: 50 });
  const t = await prisma.table.create({
    data: { weddingLayoutId: layout.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  await saveLayoutAssignment(layout.id, [{ guestId: g.id, tableId: t.id }]);
  expect(await getLayoutSeats(layout.id)).toHaveLength(1);

  await saveLayoutTables(layout.id, []);
  expect(await listLayoutTables(layout.id)).toHaveLength(0);
  expect(await getLayoutSeats(layout.id)).toHaveLength(0);
});

it("saveLayoutTables preserves ids on update so seats survive edits", async () => {
  const { wedding, momentId } = await weddingMoment("Preserve Ids");
  const g = await prisma.guest.create({ data: { weddingId: wedding.id, name: "Rui" } });
  const layout = await createBlankLayout(momentId, { name: "L", width: 10, depth: 8, scale: 50 });
  const t = await prisma.table.create({
    data: { weddingLayoutId: layout.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  await saveLayoutAssignment(layout.id, [{ guestId: g.id, tableId: t.id }]);

  await saveLayoutTables(layout.id, [{ id: t.id, shape: "round", capacity: 10, x: 5, y: 5, fixed: false }]);
  const seats = await getLayoutSeats(layout.id);
  expect(seats).toHaveLength(1);
  expect(seats[0].tableId).toBe(t.id);
  expect((await listLayoutTables(layout.id))[0].capacity).toBe(10);
});

it("deleteLayout cascades tables/seats and promotes the next layout to final", async () => {
  const { momentId } = await weddingMoment("Delete Final");
  const a = await createBlankLayout(momentId, { name: "A", width: 10, depth: 8, scale: 50 });
  const b = await createBlankLayout(momentId, { name: "B", width: 10, depth: 8, scale: 50 });

  await deleteLayout(a.id);
  const list = await listLayouts(momentId);
  expect(list).toHaveLength(1);
  expect(list[0].id).toBe(b.id);
  expect(list[0].isFinal).toBe(true);
});

it("listLayouts returns table + seated counts; clearLayoutSeats empties seating", async () => {
  const { wedding, momentId } = await weddingMoment("Counts");
  const g1 = await prisma.guest.create({ data: { weddingId: wedding.id, name: "G1" } });
  const g2 = await prisma.guest.create({ data: { weddingId: wedding.id, name: "G2" } });
  const layout = await createBlankLayout(momentId, { name: "L", width: 10, depth: 8, scale: 50 });
  const t = await prisma.table.create({
    data: { weddingLayoutId: layout.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  await saveLayoutAssignment(layout.id, [
    { guestId: g1.id, tableId: t.id },
    { guestId: g2.id, tableId: t.id },
  ]);

  let summary = (await listLayouts(momentId)).find((l) => l.id === layout.id)!;
  expect(summary.tableCount).toBe(1);
  expect(summary.seatedCount).toBe(2);

  await renameLayout(layout.id, "Renomeado");
  await clearLayoutSeats(layout.id);
  summary = (await listLayouts(momentId)).find((l) => l.id === layout.id)!;
  expect(summary.name).toBe("Renomeado");
  expect(summary.seatedCount).toBe(0);
});

it("createLayoutFromTemplate seeds elements from the template's floor plan; saveLayoutElements round-trips", async () => {
  const { venueId, floorPlanId, templateId } = await seedTemplate(1);
  const els = JSON.stringify([{ id: "e1", x: 10, y: 10, w: 200, h: 100, label: "Bar", color: "#6e8c66" }]);
  await prisma.floorPlan.update({ where: { id: floorPlanId }, data: { elements: els } });
  const { momentId } = await weddingMoment("Elements", venueId);

  const layout = await createLayoutFromTemplate(momentId, templateId, "Com bar");
  expect(layout.elements).toBe(els);

  const updated = JSON.stringify([
    { id: "e1", x: 10, y: 10, w: 200, h: 100, label: "Bar", color: "#6e8c66" },
    { id: "e2", x: 300, y: 50, w: 250, h: 150, label: "Pista", color: "#6e8c66" },
  ]);
  await saveLayoutElements(layout.id, updated);
  expect((await getLayout(layout.id))?.elements).toBe(updated);

  const blank = await createBlankLayout(momentId, { name: "Vazio", width: 10, depth: 8, scale: 50 });
  expect(blank.elements).toBeNull();
});

afterAll(async () => {
  await prisma.$disconnect();
});
