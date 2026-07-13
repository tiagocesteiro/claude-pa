import { describe, it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { createGroup } from "./groups";
import {
  listGuests,
  assignGuestGroup,
  createGuest,
  setGuestLocked,
  setGuestGroups,
  updateGuestAttributes,
  setPlusOne,
} from "./guests";
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

it("sets a guest's primary + ordered extra groups", async () => {
  const w = await createWedding({ couple: "Multi" });
  await prisma.group.createMany({
    data: [
      { id: "grpFam", weddingId: w.id, name: "Família" },
      { id: "grpFac", weddingId: w.id, name: "Faculdade" },
      { id: "grpTrab", weddingId: w.id, name: "Trabalho" },
    ],
  });
  const g = await prisma.guest.create({ data: { weddingId: w.id, name: "Ana" } });
  const updated = await setGuestGroups(g.id, "grpFam", ["grpFac", "grpTrab"]);
  expect(updated.groupId).toBe("grpFam");
  expect(JSON.parse(updated.extraGroups!)).toEqual(["grpFac", "grpTrab"]);
  const cleared = await setGuestGroups(g.id, "grpFam", []);
  expect(cleared.extraGroups).toBeNull();
});

it("defaults a new guest's rsvp to pending, persists a valid rsvp, and ignores an invalid one", async () => {
  const w = await createWedding({ couple: "RSVP Round Trip" });
  const g = await createGuest({ weddingId: w.id, name: "Confirma Lá" });
  expect(g.rsvp).toBe("pending");

  const confirmed = await updateGuestAttributes(g.id, { rsvp: "confirmed" });
  expect(confirmed.rsvp).toBe("confirmed");

  const declined = await updateGuestAttributes(g.id, { rsvp: "declined" });
  expect(declined.rsvp).toBe("declined");

  const ignored = await updateGuestAttributes(g.id, { rsvp: "bogus" });
  expect(ignored.rsvp).toBe("declined");
});

it("pairs two guests symmetrically and clears both sides", async () => {
  const w = await createWedding({ couple: "Plus One Round Trip" });
  const a = await createGuest({ weddingId: w.id, name: "Alice" });
  const b = await createGuest({ weddingId: w.id, name: "Bob" });

  const paired = await setPlusOne(a.id, b.id);
  expect(paired?.plusOneId).toBe(b.id);
  const bAfter = await prisma.guest.findUnique({ where: { id: b.id } });
  expect(bAfter?.plusOneId).toBe(a.id);

  const cleared = await setPlusOne(a.id, null);
  expect(cleared?.plusOneId).toBeNull();
  const bCleared = await prisma.guest.findUnique({ where: { id: b.id } });
  expect(bCleared?.plusOneId).toBeNull();
});

it("re-pairing frees the old partners on both sides", async () => {
  const w = await createWedding({ couple: "Plus One Re-pair" });
  const a = await createGuest({ weddingId: w.id, name: "A" });
  const b = await createGuest({ weddingId: w.id, name: "B" });
  const c = await createGuest({ weddingId: w.id, name: "C" });
  const d = await createGuest({ weddingId: w.id, name: "D" });

  await setPlusOne(a.id, b.id);
  await setPlusOne(c.id, d.id);

  // A picks C: B and D should both be freed, A<->C paired.
  const updated = await setPlusOne(a.id, c.id);
  expect(updated?.plusOneId).toBe(c.id);

  const [aAfter, bAfter, cAfter, dAfter] = await Promise.all([
    prisma.guest.findUnique({ where: { id: a.id } }),
    prisma.guest.findUnique({ where: { id: b.id } }),
    prisma.guest.findUnique({ where: { id: c.id } }),
    prisma.guest.findUnique({ where: { id: d.id } }),
  ]);
  expect(aAfter?.plusOneId).toBe(c.id);
  expect(cAfter?.plusOneId).toBe(a.id);
  expect(bAfter?.plusOneId).toBeNull();
  expect(dAfter?.plusOneId).toBeNull();
});

it("rejects pairing a guest with themselves or with a guest from another wedding", async () => {
  const w1 = await createWedding({ couple: "Plus One W1" });
  const w2 = await createWedding({ couple: "Plus One W2" });
  const a = await createGuest({ weddingId: w1.id, name: "Self Reject" });
  const other = await createGuest({ weddingId: w2.id, name: "Other Wedding" });

  const selfResult = await setPlusOne(a.id, a.id);
  expect(selfResult).toBeNull();

  const crossResult = await setPlusOne(a.id, other.id);
  expect(crossResult).toBeNull();
});

afterAll(async () => { await prisma.$disconnect(); });
