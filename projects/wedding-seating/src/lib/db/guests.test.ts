import { describe, it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { createGroup } from "./groups";
import { listGuests, assignGuestGroup } from "./guests";
import { prisma } from "./client";

it("lists guests and reassigns a guest's group", async () => {
  const w = await createWedding({ couple: "Carla & Diogo" });
  const g = await createGroup({ weddingId: w.id, name: "Amigos" });
  const guest = await prisma.guest.create({ data: { weddingId: w.id, name: "Eva" } });

  const assigned = await assignGuestGroup(guest.id, g.id);
  expect(assigned.groupId).toBe(g.id);

  const cleared = await assignGuestGroup(guest.id, null);
  expect(cleared.groupId).toBeNull();

  const all = await listGuests(w.id);
  expect(all.some((x) => x.id === guest.id)).toBe(true);
});

afterAll(async () => { await prisma.$disconnect(); });
