import { describe, it, expect, afterAll } from "vitest";
import { createTableType, listTableTypes, updateTableType, deleteTableType } from "./tableTypes";
import { prisma } from "./client";

async function venue() {
  return prisma.venue.create({ data: { name: "V Cat" } });
}

it("CRUDs table types for a venue", async () => {
  const v = await venue();
  const t = await createTableType({
    venueId: v.id, name: "Redonda 8", shape: "round", minSeats: 6, maxSeats: 8, width: 1.5, depth: 1.5, quantity: 10,
  });
  expect(t.maxSeats).toBe(8);
  const updated = await updateTableType(t.id, { quantity: 12 });
  expect(updated.quantity).toBe(12);
  expect((await listTableTypes(v.id)).length).toBe(1);
  await deleteTableType(t.id);
  expect((await listTableTypes(v.id)).length).toBe(0);
});

afterAll(async () => { await prisma.$disconnect(); });
