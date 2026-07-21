import { it, expect, afterAll } from "vitest";
import {
  AccessError,
  assertVenueBooking,
  assertMomentVenueAccess,
  assertMaterialAccess,
  getVenueWeddingView,
} from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { createWedding } from "@/lib/db/weddings";
import { createSupplier } from "@/lib/db/suppliers";
import { createTask } from "@/lib/db/tasks";
import { addCustomDecor } from "@/lib/db/momentDecor";
import { createMaterial } from "@/lib/db/materials";
import { createBlankLayout, setFinalLayout } from "@/lib/db/layouts";
import { prisma } from "@/lib/db/client";

const VA: Actor = { userId: "vw-venue-A", email: "va@t.pt", role: "venue" };
const VB: Actor = { userId: "vw-venue-B", email: "vb@t.pt", role: "venue" };
const CA: Actor = { userId: "vw-couple-A", email: "ca@t.pt", role: "couple" };
const SECRET = "SuperSecretGuestName";

it("venue booking window: only the booking venue (or admin) can read; couples denied", async () => {
  const venueA = await prisma.venue.create({ data: { name: "VW A", ownerId: VA.userId } });
  const w = await createWedding({ couple: "Ana & Rui", ownerId: CA.userId, venueId: venueA.id });
  await prisma.guest.create({ data: { weddingId: w.id, name: `${SECRET}1`, rsvp: "confirmed" } });

  await expect(assertVenueBooking(VA, w.id, "read")).resolves.toBeUndefined();
  await expect(assertVenueBooking(VB, w.id, "read")).rejects.toBeInstanceOf(AccessError); // other venue
  await expect(assertVenueBooking(CA, w.id, "read")).rejects.toBeInstanceOf(AccessError); // couple denied
});

it("getVenueWeddingView is PII-free and includes layout/decor/material/pending tasks", async () => {
  const venueA = await prisma.venue.create({ data: { name: "VW View", ownerId: VA.userId } });
  const w = await createWedding({ couple: "Bea & Tó", ownerId: CA.userId, venueId: venueA.id });
  await prisma.guest.create({ data: { weddingId: w.id, name: `${SECRET}2`, rsvp: "confirmed", dietary: "vegan" } });
  await prisma.guest.create({ data: { weddingId: w.id, name: `${SECRET}3`, rsvp: "pending" } });

  const dinner = await prisma.weddingMoment.findFirstOrThrow({ where: { weddingId: w.id, kind: "dinner" } });
  const layout = await createBlankLayout(dinner.id, { name: "Salão", width: 10, depth: 8, scale: 50 });
  await setFinalLayout(dinner.id, layout.id);
  await prisma.table.create({ data: { weddingLayoutId: layout.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false } });
  await addCustomDecor(dinner.id, { name: "Velas", quantity: 20 });
  const supplier = await createSupplier(w.id, { name: "DJ Beat" });
  await createTask(dinner.id, { text: "Levar tomadas triplas", assignee: "venue" });
  await createTask(dinner.id, { text: "Feito já", assignee: "supplier", supplierId: supplier.id });
  await prisma.momentTask.updateMany({ where: { momentId: dinner.id, text: "Feito já" }, data: { done: true } });
  await createMaterial(dinner.id, { name: "Extensão elétrica", quantity: 3, note: "para o DJ" });

  const view = (await getVenueWeddingView(w.id))!;
  expect(view.couple).toBe("Bea & Tó");
  expect(view.guests).toEqual({ total: 2, confirmed: 1, pending: 1, declined: 0 });

  const dm = view.moments.find((m) => m.kind === "dinner")!;
  expect(dm.finalLayout).toEqual({ name: "Salão", tableCount: 1, seatedCount: 0 });
  expect(dm.decor).toEqual([{ name: "Velas", category: null, quantity: 20 }]);
  expect(dm.materials.map((x) => x.name)).toContain("Extensão elétrica");
  // pending tasks only (the done one is excluded)
  expect(dm.pendingTasks.map((t) => t.text)).toEqual(["Levar tomadas triplas"]);

  // Strongest PII check: no guest name / dietary anywhere in the payload.
  const serialized = JSON.stringify(view);
  expect(serialized).not.toContain(SECRET);
  expect(serialized).not.toContain("vegan");
});

it("material tenancy: only the booking venue can reach a moment's materials", async () => {
  const venueA = await prisma.venue.create({ data: { name: "VW Mat", ownerId: VA.userId } });
  const w = await createWedding({ couple: "Mat Couple", ownerId: CA.userId, venueId: venueA.id });
  const moment = await prisma.weddingMoment.findFirstOrThrow({ where: { weddingId: w.id, kind: "dinner" } });
  const mat = await createMaterial(moment.id, { name: "Tomadas triplas", quantity: 5 });

  await expect(assertMomentVenueAccess(VA, moment.id, "write")).resolves.toBeUndefined();
  await expect(assertMomentVenueAccess(VB, moment.id, "read")).rejects.toBeInstanceOf(AccessError);
  await expect(assertMomentVenueAccess(CA, moment.id, "read")).rejects.toBeInstanceOf(AccessError);

  await expect(assertMaterialAccess(VA, mat.id, "write")).resolves.toBeUndefined();
  await expect(assertMaterialAccess(VB, mat.id, "write")).rejects.toBeInstanceOf(AccessError);
});

afterAll(async () => {
  await prisma.$disconnect();
});
