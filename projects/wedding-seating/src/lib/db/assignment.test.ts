import { describe, it, expect, afterAll } from "vitest";
import { saveAssignment, clearAssignment } from "./assignment";
import { createWedding } from "./weddings";
import { listGuests } from "./guests";
import { prisma } from "./client";

it("saves and clears guest→table assignments", async () => {
  const w = await createWedding({ couple: "Assign Test" });
  const g1 = await prisma.guest.create({ data: { weddingId: w.id, name: "A" } });
  const g2 = await prisma.guest.create({ data: { weddingId: w.id, name: "B" } });

  await saveAssignment(w.id, [
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

it("saveAssignment ignores guests from OTHER weddings (tenancy — review C1)", async () => {
  const mine = await createWedding({ couple: "Mine" });
  const other = await createWedding({ couple: "Other" });
  const myGuest = await prisma.guest.create({ data: { weddingId: mine.id, name: "Meu" } });
  const victim = await prisma.guest.create({
    data: { weddingId: other.id, name: "Vítima", assignedTableId: "safe" },
  });

  // Attempt to also mutate the other wedding's guest via my wedding's scope.
  await saveAssignment(mine.id, [
    { guestId: myGuest.id, tableId: "t1" },
    { guestId: victim.id, tableId: null },
  ]);

  expect((await prisma.guest.findUnique({ where: { id: myGuest.id } }))?.assignedTableId).toBe("t1");
  // The victim (other wedding) must be untouched.
  expect((await prisma.guest.findUnique({ where: { id: victim.id } }))?.assignedTableId).toBe("safe");
});

afterAll(async () => { await prisma.$disconnect(); });
