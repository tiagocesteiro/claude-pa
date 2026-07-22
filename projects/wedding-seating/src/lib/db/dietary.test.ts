import { it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { createBlankLayout } from "./layouts";
import { getDietaryByTable } from "./dietary";
import { addParticipant } from "./participants";
import { assertDietaryAccess, AccessError } from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

it("getDietaryByTable aggregates the final dinner layout per table, no names", async () => {
  const w = await createWedding({ couple: "Diet Agg" });
  const moment = await prisma.weddingMoment.findFirstOrThrow({ where: { weddingId: w.id }, orderBy: { order: "asc" } });
  await prisma.weddingMoment.update({ where: { id: moment.id }, data: { hasSeating: true } });

  const layout = await createBlankLayout(moment.id, { name: "Final", width: 10, depth: 8, scale: 50 });
  expect(layout.isFinal).toBe(true); // first layout of the moment

  const t1 = await prisma.table.create({ data: { weddingLayoutId: layout.id, shape: "round", capacity: 8, x: 0, y: 0, name: "Mesa Noivos" } });
  const t2 = await prisma.table.create({ data: { weddingLayoutId: layout.id, shape: "round", capacity: 8, x: 1, y: 0 } });

  const guests = await Promise.all([
    prisma.guest.create({ data: { weddingId: w.id, name: "A", dietary: "Vegetariano" } }),
    prisma.guest.create({ data: { weddingId: w.id, name: "B", dietary: "vegetariano" } }), // same, case-insensitive
    prisma.guest.create({ data: { weddingId: w.id, name: "C" } }), // no dietary → "Sem restrição"
    prisma.guest.create({ data: { weddingId: w.id, name: "D", dietary: "Sem glúten" } }),
  ]);
  // t1: A, B, C ; t2: D
  await prisma.layoutSeat.createMany({
    data: [
      { weddingLayoutId: layout.id, guestId: guests[0].id, tableId: t1.id },
      { weddingLayoutId: layout.id, guestId: guests[1].id, tableId: t1.id },
      { weddingLayoutId: layout.id, guestId: guests[2].id, tableId: t1.id },
      { weddingLayoutId: layout.id, guestId: guests[3].id, tableId: t2.id },
    ],
  });

  const view = await getDietaryByTable(w.id);
  expect(view).not.toBeNull();
  expect(view!.totalSeated).toBe(4);
  expect(view!.overall).toEqual([
    { label: "Sem restrição", count: 1 },
    { label: "Sem glúten", count: 1 },
    { label: "Vegetariano", count: 2 },
  ]);

  const noivos = view!.tables.find((t) => t.tableName === "Mesa Noivos")!;
  expect(noivos.total).toBe(3);
  expect(noivos.diets).toEqual([
    { label: "Sem restrição", count: 1 },
    { label: "Vegetariano", count: 2 },
  ]);

  const other = view!.tables.find((t) => t.tableName !== "Mesa Noivos")!;
  expect(other.tableName).toMatch(/^Mesa \d+$/); // unnamed → positional label
  expect(other.total).toBe(1);
  expect(other.diets).toEqual([{ label: "Sem glúten", count: 1 }]);
});

it("getDietaryByTable is null without a final seated layout", async () => {
  const w = await createWedding({ couple: "No Seating" });
  expect(await getDietaryByTable(w.id)).toBeNull();
});

it("assertDietaryAccess: venue + catering supplier only", async () => {
  const venue = await prisma.venue.create({ data: { name: "Diet Venue", ownerId: "dv-venue" } });
  const w = await createWedding({ couple: "Diet Gate", ownerId: "dv-couple", venueId: venue.id });
  const cat = await prisma.supplier.create({ data: { weddingId: w.id, name: "Cat", service: "catering" } });
  const dj = await prisma.supplier.create({ data: { weddingId: w.id, name: "DJ", service: "dj" } });
  await addParticipant(w.id, "dv-cat", "supplier", cat.id);
  await addParticipant(w.id, "dv-dj", "supplier", dj.id);

  const venueActor: Actor = { userId: "dv-venue", email: "", role: "venue" };
  const coupleActor: Actor = { userId: "dv-couple", email: "", role: "couple" };
  const catActor: Actor = { userId: "dv-cat", email: "", role: "supplier" };
  const djActor: Actor = { userId: "dv-dj", email: "", role: "supplier" };

  await expect(assertDietaryAccess(venueActor, w.id)).resolves.toBeUndefined();
  await expect(assertDietaryAccess(catActor, w.id)).resolves.toBeUndefined();
  await expect(assertDietaryAccess(djActor, w.id)).rejects.toBeInstanceOf(AccessError); // non-catering supplier
  await expect(assertDietaryAccess(coupleActor, w.id)).rejects.toBeInstanceOf(AccessError); // couple has no dietary channel here
});

afterAll(async () => {
  await prisma.$disconnect();
});
