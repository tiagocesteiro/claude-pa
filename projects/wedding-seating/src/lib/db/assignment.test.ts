import { describe, it, expect, afterAll } from "vitest";
import { saveAssignment, clearAssignment } from "./assignment";
import { createWedding } from "./weddings";
import { listGuests } from "./guests";
import { prisma } from "./client";

it("saves and clears guest→table assignments", async () => {
  const w = await createWedding({ couple: "Assign Test" });
  const g1 = await prisma.guest.create({ data: { weddingId: w.id, name: "A" } });
  const g2 = await prisma.guest.create({ data: { weddingId: w.id, name: "B" } });

  await saveAssignment([
    { guestId: g1.id, tableId: "t1" },
    { guestId: g2.id, tableId: "t2" },
  ]);
  let guests = await listGuests(w.id);
  expect(guests.find((g) => g.id === g1.id)?.assignedTableId).toBe("t1");
  expect(guests.find((g) => g.id === g2.id)?.assignedTableId).toBe("t2");

  await clearAssignment(w.id);
  guests = await listGuests(w.id);
  expect(guests.every((g) => g.assignedTableId === null)).toBe(true);
});

afterAll(async () => { await prisma.$disconnect(); });
