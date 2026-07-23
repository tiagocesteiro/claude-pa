import { it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { createRequirement, listRequirements, updateRequirement, addComment, getRequirement } from "./requirements";
import { addService } from "./services";
import { addParticipant } from "./participants";
import { assertRequirementAccess, canConfirmRequirement, AccessError, type WeddingRole } from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

async function scenario() {
  const venue = await prisma.venue.create({ data: { name: "Rq Venue", ownerId: "rq-venue" } });
  const w = await createWedding({ couple: "Rq Wedding", ownerId: "rq-couple", venueId: venue.id });
  const supA = await prisma.supplier.create({ data: { weddingId: w.id, name: "Cat A", service: "catering" } });
  const supB = await prisma.supplier.create({ data: { weddingId: w.id, name: "DJ B", service: "dj" } });
  await addParticipant(w.id, "rq-supA", "supplier", supA.id);
  await addParticipant(w.id, "rq-supB", "supplier", supB.id);
  // A service provided by supplier A (catering).
  const svcA = await addService(w.id, { kind: "catering", providerType: "supplier", supplierId: supA.id });

  const r1 = await createRequirement(w.id, { title: "8 mesas + 12m", fromRole: "supplier", fromProfileId: "rq-supA", toRole: "venue" });
  const r2 = await createRequirement(w.id, { title: "Zona de montagem", fromRole: "venue", fromProfileId: "rq-venue", toSupplierId: supB.id });
  const r3 = await createRequirement(w.id, { title: "Menu final", fromRole: "venue", fromProfileId: "rq-venue", serviceId: svcA.id });
  return { w, supA, supB, r1, r2, r3 };
}

it("scoped listing: venue/couple see all, a supplier sees only their slice", async () => {
  const { w, r1, r2, r3 } = await scenario();

  const all = await listRequirements(w.id, { kind: "all" });
  expect(all.map((r) => r.id).sort()).toEqual([r1.id, r2.id, r3.id].sort());

  // Supplier A: raised r1 + provides the service on r3 → sees both, not r2.
  const aList = await listRequirements(w.id, { kind: "supplier", supplierId: (await scenarioSupIds(w.id)).supA, profileId: "rq-supA" });
  expect(aList.map((r) => r.id).sort()).toEqual([r1.id, r3.id].sort());

  // Supplier B: only r2 (addressed to their slot).
  const bList = await listRequirements(w.id, { kind: "supplier", supplierId: (await scenarioSupIds(w.id)).supB, profileId: "rq-supB" });
  expect(bList.map((r) => r.id)).toEqual([r2.id]);
});

// Helper: resolve the two supplier slot ids of the wedding by name.
async function scenarioSupIds(weddingId: string) {
  const sups = await prisma.supplier.findMany({ where: { weddingId } });
  return { supA: sups.find((s) => s.name === "Cat A")!.id, supB: sups.find((s) => s.name === "DJ B")!.id };
}

it("assertRequirementAccess capability matrix", async () => {
  const { r1, r2 } = await scenario();

  const venue: Actor = { userId: "rq-venue", email: "", role: "venue" };
  const couple: Actor = { userId: "rq-couple", email: "", role: "couple" };
  const supA: Actor = { userId: "rq-supA", email: "", role: "supplier" };
  const supB: Actor = { userId: "rq-supB", email: "", role: "supplier" };

  // venue writes anything
  await expect(assertRequirementAccess(venue, r1.id, "write")).resolves.toMatchObject({ role: "venue" });
  // couple reads all; writes only when involved (r1/r2 are not couple-involved)
  await expect(assertRequirementAccess(couple, r1.id, "read")).resolves.toMatchObject({ role: "couple" });
  await expect(assertRequirementAccess(couple, r1.id, "write")).rejects.toBeInstanceOf(AccessError);
  // supplier A: involved in r1 (raiser) → read+write; not involved in r2 → 404
  await expect(assertRequirementAccess(supA, r1.id, "write")).resolves.toMatchObject({ role: "supplier" });
  await expect(assertRequirementAccess(supA, r2.id, "read")).rejects.toBeInstanceOf(AccessError);
  // supplier B: involved in r2 (target slot) → ok; not in r1 → 404
  await expect(assertRequirementAccess(supB, r2.id, "write")).resolves.toMatchObject({ role: "supplier" });
  await expect(assertRequirementAccess(supB, r1.id, "read")).rejects.toBeInstanceOf(AccessError);
});

it("lifecycle status + comments", async () => {
  const { r1 } = await scenario();
  const agreed = await updateRequirement(r1.id, { status: "agreed" });
  expect(agreed.status).toBe("agreed");

  await addComment(r1.id, { authorRole: "venue", authorProfileId: "rq-venue", text: "Confirmado, fica assim." });
  const withComment = await getRequirement(r1.id);
  expect(withComment?.comments.length).toBe(1);
  expect(withComment?.comments[0].authorRole).toBe("venue");
});

it("createRequirement stores optional structured data (and drops empty)", async () => {
  const w = await createWedding({ couple: "Req Data" });
  const r = await createRequirement(w.id, {
    title: "Cocktail", fromRole: "supplier", data: { tables: 8, linearMeters: 12, time: "19:00" },
  });
  expect(r.data).toEqual({ tables: 8, linearMeters: 12, time: "19:00" });

  const r2 = await createRequirement(w.id, { title: "Sem dados", fromRole: "venue", data: {} });
  expect(r2.data).toBeNull();
});

it("canConfirmRequirement: only the addressed counterpart may agree (never the raiser)", () => {
  const venue: WeddingRole = { role: "venue" };
  const couple: WeddingRole = { role: "couple" };
  const supA: WeddingRole = { role: "supplier", supplierId: "slotA" };
  const supB: WeddingRole = { role: "supplier", supplierId: "slotB" };
  const admin: WeddingRole = { role: "admin" };

  // supplier → venue: the venue confirms; couple can't; the raiser can't.
  const supToVenue = { fromProfileId: "p-sup", toSupplierId: null, toRole: "venue" };
  expect(canConfirmRequirement(venue, "p-venue", supToVenue)).toBe(true);
  expect(canConfirmRequirement(couple, "p-couple", supToVenue)).toBe(false);
  expect(canConfirmRequirement(supA, "p-sup", supToVenue)).toBe(false);

  // venue → supplierA: only that supplier; other suppliers can't; raiser venue can't.
  const venueToSupA = { fromProfileId: "p-venue", toSupplierId: "slotA", toRole: null };
  expect(canConfirmRequirement(supA, "p-supA", venueToSupA)).toBe(true);
  expect(canConfirmRequirement(supB, "p-supB", venueToSupA)).toBe(false);
  expect(canConfirmRequirement(venue, "p-venue", venueToSupA)).toBe(false);

  // venue → couple: the couple confirms; raiser venue can't.
  const venueToCouple = { fromProfileId: "p-venue", toSupplierId: null, toRole: "couple" };
  expect(canConfirmRequirement(couple, "p-couple", venueToCouple)).toBe(true);
  expect(canConfirmRequirement(venue, "p-venue", venueToCouple)).toBe(false);

  // admin may confirm — but not even admin can self-agree (raiser is blocked first).
  expect(canConfirmRequirement(admin, "p-admin", supToVenue)).toBe(true);
  expect(canConfirmRequirement(admin, "p-sup", supToVenue)).toBe(false);
});

it("updateRequirement round-trips the agreement trail", async () => {
  const w = await createWedding({ couple: "Handshake" });
  const r = await createRequirement(w.id, { title: "Acordar", fromRole: "supplier", fromProfileId: "hs-sup", toRole: "venue" });
  const agreed = await updateRequirement(r.id, {
    status: "agreed", agreedByProfileId: "hs-venue", agreedByRole: "venue", agreedAt: new Date(),
  });
  expect(agreed.status).toBe("agreed");
  expect(agreed.agreedByRole).toBe("venue");
  expect(agreed.agreedAt).not.toBeNull();

  // Reopening clears the trail.
  const reopened = await updateRequirement(r.id, { status: "open", agreedByProfileId: null, agreedByRole: null, agreedAt: null });
  expect(reopened.status).toBe("open");
  expect(reopened.agreedByRole).toBeNull();
  expect(reopened.agreedAt).toBeNull();
});

afterAll(async () => {
  await prisma.$disconnect();
});
