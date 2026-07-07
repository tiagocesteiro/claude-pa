import { describe, it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { createGroup } from "./groups";
import { listGuests, assignGuestGroup, createGuest, setGuestLocked } from "./guests";
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

it("creates a guest manually and toggles its lock", async () => {
  const w = await createWedding({ couple: "Manual Add" });
  const g = await createGuest({ weddingId: w.id, name: "Zé Manual" });
  expect(g.name).toBe("Zé Manual");
  expect(g.locked).toBe(false);
  const locked = await setGuestLocked(g.id, true);
  expect(locked.locked).toBe(true);
});

afterAll(async () => { await prisma.$disconnect(); });
