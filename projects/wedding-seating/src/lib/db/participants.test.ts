import { it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { addParticipant, getParticipant, listParticipants, removeParticipant, listWeddingIdsForProfile } from "./participants";
import { getWeddingRole } from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

const admin: Actor = { userId: "p-admin", email: "a@t.pt", role: "admin" };

it("createWedding seeds venue + couple participants", async () => {
  const venue = await prisma.venue.create({ data: { name: "P Venue", ownerId: "p-venue-owner" } });
  const w = await createWedding({ couple: "Ana & Rui", ownerId: "p-couple", venueId: venue.id });
  const parts = await listParticipants(w.id);
  const byRole = Object.fromEntries(parts.map((p) => [p.role, p.profileId]));
  expect(byRole.couple).toBe("p-couple");
  expect(byRole.venue).toBe("p-venue-owner");
});

it("participants CRUD + listWeddingIdsForProfile", async () => {
  const w = await createWedding({ couple: "CRUD" });
  await addParticipant(w.id, "prof-1", "supplier", "sup-1");
  const p = await getParticipant(w.id, "prof-1");
  expect(p?.role).toBe("supplier");
  expect(p?.supplierId).toBe("sup-1");
  // idempotent upsert (role change)
  await addParticipant(w.id, "prof-1", "supplier", "sup-2");
  expect((await getParticipant(w.id, "prof-1"))?.supplierId).toBe("sup-2");

  expect((await listWeddingIdsForProfile("prof-1")).some((x) => x.weddingId === w.id)).toBe(true);

  await removeParticipant(w.id, "prof-1");
  expect(await getParticipant(w.id, "prof-1")).toBeNull();
});

it("getWeddingRole resolves participant roles, supplier service, and admin", async () => {
  const venue = await prisma.venue.create({ data: { name: "Role Venue", ownerId: "rv-owner" } });
  const w = await createWedding({ couple: "Roles", ownerId: "rv-couple", venueId: venue.id });
  const supplier = await prisma.supplier.create({ data: { weddingId: w.id, name: "Catering X", service: "catering" } });
  await addParticipant(w.id, "rv-supplier", "supplier", supplier.id);

  const venueActor: Actor = { userId: "rv-owner", email: "", role: "venue" };
  const coupleActor: Actor = { userId: "rv-couple", email: "", role: "couple" };
  const supActor: Actor = { userId: "rv-supplier", email: "", role: "supplier" };
  const stranger: Actor = { userId: "rv-stranger", email: "", role: "supplier" };

  expect((await getWeddingRole(venueActor, w.id))?.role).toBe("venue");
  expect((await getWeddingRole(coupleActor, w.id))?.role).toBe("couple");
  const sr = await getWeddingRole(supActor, w.id);
  expect(sr?.role).toBe("supplier");
  expect(sr?.supplierId).toBe(supplier.id);
  expect(sr?.service).toBe("catering");
  expect((await getWeddingRole(admin, w.id))?.role).toBe("admin");
  expect(await getWeddingRole(stranger, w.id)).toBeNull();
});

it("getWeddingRole legacy fallback (no participant rows)", async () => {
  // A wedding created directly (no participant seeding), like pre-migration data.
  const venue = await prisma.venue.create({ data: { name: "Legacy Venue", ownerId: "lg-venue" } });
  const w = await prisma.wedding.create({ data: { couple: "Legacy", ownerId: "lg-couple", venueId: venue.id } });

  expect((await getWeddingRole({ userId: "lg-couple", email: "", role: "couple" }, w.id))?.role).toBe("couple");
  expect((await getWeddingRole({ userId: "lg-venue", email: "", role: "venue" }, w.id))?.role).toBe("venue");
  expect(await getWeddingRole({ userId: "nobody", email: "", role: "couple" }, w.id)).toBeNull();
});

afterAll(async () => {
  await prisma.$disconnect();
});
