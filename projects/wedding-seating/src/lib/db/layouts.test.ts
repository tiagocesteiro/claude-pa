import { it, expect, afterAll } from "vitest";
import {
  listLayouts,
  getFinalLayout,
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

it("createLayoutFromTemplate copies the template's tables + adopts its floor plan", async () => {
  const { venueId, floorPlanId, templateId } = await seedTemplate(3);
  const w = await createWedding({ couple: "From Template", venueId });

  const layout = await createLayoutFromTemplate(w.id, templateId, "Principal");

  expect(layout.floorPlanId).toBe(floorPlanId);
  expect(layout.templateId).toBe(templateId);
  const tables = await listLayoutTables(layout.id);
  expect(tables.length).toBe(3);
  expect(tables.every((t) => t.weddingLayoutId === layout.id)).toBe(true);
  // Fresh ids — not the template's rows.
  const tplTables = await prisma.table.findMany({ where: { templateId } });
  const tplIds = new Set(tplTables.map((t) => t.id));
  expect(tables.every((t) => !tplIds.has(t.id))).toBe(true);
});

it("the first layout of a wedding becomes final; later ones do not", async () => {
  const w = await createWedding({ couple: "First Final" });
  const a = await createBlankLayout(w.id, { name: "A", width: 10, depth: 8, scale: 50 });
  const b = await createBlankLayout(w.id, { name: "B", width: 10, depth: 8, scale: 50 });

  expect(a.isFinal).toBe(true);
  expect(b.isFinal).toBe(false);
  expect((await getFinalLayout(w.id))?.id).toBe(a.id);
});

it("setFinalLayout marks exactly one, scoped to the wedding", async () => {
  const w = await createWedding({ couple: "Set Final" });
  const a = await createBlankLayout(w.id, { name: "A", width: 10, depth: 8, scale: 50 });
  const b = await createBlankLayout(w.id, { name: "B", width: 10, depth: 8, scale: 50 });

  await setFinalLayout(w.id, b.id);
  const list = await listLayouts(w.id);
  expect(list.find((l) => l.id === a.id)?.isFinal).toBe(false);
  expect(list.find((l) => l.id === b.id)?.isFinal).toBe(true);
  expect(list.filter((l) => l.isFinal).length).toBe(1);

  // A layout id from ANOTHER wedding must not flip this wedding's flags.
  const other = await createWedding({ couple: "Other" });
  const oLayout = await createBlankLayout(other.id, { name: "O", width: 5, depth: 5, scale: 50 });
  await setFinalLayout(w.id, oLayout.id); // no-op for w (oLayout not in w)
  const list2 = await listLayouts(w.id);
  // b stays final; the foreign id changed nothing, and no w-layout was set final by it.
  expect(list2.find((l) => l.id === b.id)?.isFinal).toBe(true);
});

it("seating is independent per layout — same guest, different tables", async () => {
  const w = await createWedding({ couple: "Per-layout seating" });
  const g = await prisma.guest.create({ data: { weddingId: w.id, name: "Ana" } });
  const la = await createBlankLayout(w.id, { name: "A", width: 10, depth: 8, scale: 50 });
  const lb = await createBlankLayout(w.id, { name: "B", width: 10, depth: 8, scale: 50 });
  const ta = await prisma.table.create({
    data: { weddingLayoutId: la.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  const tb = await prisma.table.create({
    data: { weddingLayoutId: lb.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });

  await saveLayoutAssignment(la.id, [{ guestId: g.id, tableId: ta.id }]);
  await saveLayoutAssignment(lb.id, [{ guestId: g.id, tableId: tb.id }]);

  const seatsA = await getLayoutSeats(la.id);
  const seatsB = await getLayoutSeats(lb.id);
  expect(seatsA).toHaveLength(1);
  expect(seatsA[0].tableId).toBe(ta.id);
  expect(seatsB[0].tableId).toBe(tb.id);
});

it("saveLayoutAssignment ignores foreign guests and foreign tables (tenancy)", async () => {
  const w = await createWedding({ couple: "Mine" });
  const other = await createWedding({ couple: "Other" });
  const mine = await createBlankLayout(w.id, { name: "M", width: 10, depth: 8, scale: 50 });
  const otherLayout = await createBlankLayout(other.id, { name: "O", width: 10, depth: 8, scale: 50 });
  const myGuest = await prisma.guest.create({ data: { weddingId: w.id, name: "Meu" } });
  const foreignGuest = await prisma.guest.create({ data: { weddingId: other.id, name: "Alheio" } });
  const myTable = await prisma.table.create({
    data: { weddingLayoutId: mine.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  const foreignTable = await prisma.table.create({
    data: { weddingLayoutId: otherLayout.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });

  await saveLayoutAssignment(mine.id, [
    { guestId: myGuest.id, tableId: myTable.id }, // ok
    { guestId: foreignGuest.id, tableId: myTable.id }, // foreign guest → ignored
    { guestId: myGuest.id, tableId: foreignTable.id }, // foreign table → ignored (keeps prior)
  ]);

  const seats = await getLayoutSeats(mine.id);
  expect(seats).toHaveLength(1);
  expect(seats[0].guestId).toBe(myGuest.id);
  expect(seats[0].tableId).toBe(myTable.id);
});

it("removing a table from a layout drops its seats (cascade)", async () => {
  const w = await createWedding({ couple: "Remove Table" });
  const g = await prisma.guest.create({ data: { weddingId: w.id, name: "Zé" } });
  const layout = await createBlankLayout(w.id, { name: "L", width: 10, depth: 8, scale: 50 });
  const t = await prisma.table.create({
    data: { weddingLayoutId: layout.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  await saveLayoutAssignment(layout.id, [{ guestId: g.id, tableId: t.id }]);
  expect(await getLayoutSeats(layout.id)).toHaveLength(1);

  // saveLayoutTables with an empty list removes the table → its seat cascades away.
  await saveLayoutTables(layout.id, []);
  expect(await listLayoutTables(layout.id)).toHaveLength(0);
  expect(await getLayoutSeats(layout.id)).toHaveLength(0);
});

it("saveLayoutTables preserves ids on update so seats survive edits", async () => {
  const w = await createWedding({ couple: "Preserve Ids" });
  const g = await prisma.guest.create({ data: { weddingId: w.id, name: "Rui" } });
  const layout = await createBlankLayout(w.id, { name: "L", width: 10, depth: 8, scale: 50 });
  const t = await prisma.table.create({
    data: { weddingLayoutId: layout.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  await saveLayoutAssignment(layout.id, [{ guestId: g.id, tableId: t.id }]);

  // Move the same table (keep its id) → seat must remain.
  await saveLayoutTables(layout.id, [
    { id: t.id, shape: "round", capacity: 10, x: 5, y: 5, fixed: false },
  ]);
  const seats = await getLayoutSeats(layout.id);
  expect(seats).toHaveLength(1);
  expect(seats[0].tableId).toBe(t.id);
  const tables = await listLayoutTables(layout.id);
  expect(tables[0].capacity).toBe(10);
});

it("deleteLayout cascades tables/seats and promotes the next layout to final", async () => {
  const w = await createWedding({ couple: "Delete Final" });
  const a = await createBlankLayout(w.id, { name: "A", width: 10, depth: 8, scale: 50 }); // final
  const b = await createBlankLayout(w.id, { name: "B", width: 10, depth: 8, scale: 50 });

  await deleteLayout(a.id);
  const list = await listLayouts(w.id);
  expect(list).toHaveLength(1);
  expect(list[0].id).toBe(b.id);
  expect(list[0].isFinal).toBe(true); // promoted
});

it("listLayouts returns table + seated counts; clearLayoutSeats empties seating", async () => {
  const w = await createWedding({ couple: "Counts" });
  const g1 = await prisma.guest.create({ data: { weddingId: w.id, name: "G1" } });
  const g2 = await prisma.guest.create({ data: { weddingId: w.id, name: "G2" } });
  const layout = await createBlankLayout(w.id, { name: "L", width: 10, depth: 8, scale: 50 });
  const t = await prisma.table.create({
    data: { weddingLayoutId: layout.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  await saveLayoutAssignment(layout.id, [
    { guestId: g1.id, tableId: t.id },
    { guestId: g2.id, tableId: t.id },
  ]);

  let summary = (await listLayouts(w.id)).find((l) => l.id === layout.id)!;
  expect(summary.tableCount).toBe(1);
  expect(summary.seatedCount).toBe(2);

  await renameLayout(layout.id, "Renomeado");
  await clearLayoutSeats(layout.id);
  summary = (await listLayouts(w.id)).find((l) => l.id === layout.id)!;
  expect(summary.name).toBe("Renomeado");
  expect(summary.seatedCount).toBe(0);
});

afterAll(async () => {
  await prisma.$disconnect();
});
