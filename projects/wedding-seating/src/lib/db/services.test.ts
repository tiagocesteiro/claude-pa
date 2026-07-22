import { it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { addService, listServices, updateService, deleteService, getService } from "./services";
import { addParticipant } from "./participants";
import { assertServiceAccess, AccessError } from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

const admin: Actor = { userId: "sv-admin", email: "a@t.pt", role: "admin" };

it("addService defaults to venue provider and CRUD works", async () => {
  const w = await createWedding({ couple: "Svc CRUD" });
  const catering = await addService(w.id, { kind: "catering" });
  expect(catering.providerType).toBe("venue");
  expect(catering.status).toBe("planned");

  const decor = await addService(w.id, { kind: "decor", providerType: "couple" });
  expect(decor.providerType).toBe("couple");

  const list = await listServices(w.id);
  expect(list.map((s) => s.kind).sort()).toEqual(["catering", "decor"]);

  const done = await updateService(catering.id, { status: "done" });
  expect(done.status).toBe("done");

  await deleteService(decor.id);
  expect(await getService(decor.id)).toBeNull();
});

it("supplierId is only kept when provider is a supplier", async () => {
  const w = await createWedding({ couple: "Svc Provider" });
  const sup = await prisma.supplier.create({ data: { weddingId: w.id, name: "Decor Ext", service: "decor" } });

  // provider=venue → supplierId ignored on create
  const asVenue = await addService(w.id, { kind: "decor", providerType: "venue", supplierId: sup.id });
  expect(asVenue.supplierId).toBeNull();

  // switch to supplier + assign
  const assigned = await updateService(asVenue.id, { providerType: "supplier", supplierId: sup.id });
  expect(assigned.providerType).toBe("supplier");
  expect(assigned.supplierId).toBe(sup.id);

  // switch back to venue clears the supplier link
  const cleared = await updateService(assigned.id, { providerType: "venue" });
  expect(cleared.supplierId).toBeNull();
});

it("assertServiceAccess: venue writes, couple/supplier read, stranger denied", async () => {
  const venue = await prisma.venue.create({ data: { name: "Svc Venue", ownerId: "sv-venue" } });
  const w = await createWedding({ couple: "Svc Access", ownerId: "sv-couple", venueId: venue.id });
  const sup = await prisma.supplier.create({ data: { weddingId: w.id, name: "Cat", service: "catering" } });
  await addParticipant(w.id, "sv-supplier", "supplier", sup.id);
  const svc = await addService(w.id, { kind: "catering" });

  const venueActor: Actor = { userId: "sv-venue", email: "", role: "venue" };
  const coupleActor: Actor = { userId: "sv-couple", email: "", role: "couple" };
  const supActor: Actor = { userId: "sv-supplier", email: "", role: "supplier" };
  const stranger: Actor = { userId: "sv-nobody", email: "", role: "couple" };

  // venue can write
  await expect(assertServiceAccess(venueActor, svc.id, "write")).resolves.toBe(w.id);
  // couple + supplier can read but NOT write
  await expect(assertServiceAccess(coupleActor, svc.id, "read")).resolves.toBe(w.id);
  await expect(assertServiceAccess(supActor, svc.id, "read")).resolves.toBe(w.id);
  await expect(assertServiceAccess(coupleActor, svc.id, "write")).rejects.toBeInstanceOf(AccessError);
  await expect(assertServiceAccess(supActor, svc.id, "write")).rejects.toBeInstanceOf(AccessError);
  // admin can write
  await expect(assertServiceAccess(admin, svc.id, "write")).resolves.toBe(w.id);
  // stranger (participant of nothing) denied even read
  await expect(assertServiceAccess(stranger, svc.id, "read")).rejects.toBeInstanceOf(AccessError);
  // unknown id → 404
  await expect(assertServiceAccess(venueActor, "nope", "read")).rejects.toBeInstanceOf(AccessError);
});

afterAll(async () => {
  await prisma.$disconnect();
});
