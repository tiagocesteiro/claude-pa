import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/client";
import type { Actor } from "./actor";
import { AccessError } from "./access";
import {
  listVenuesFor,
  listWeddingsFor,
  assertVenueAccess,
  assertFloorPlanAccess,
  assertTemplateAccess,
  assertTableTypeAccess,
  assertWeddingAccess,
  assertGuestAccess,
} from "./access";

/**
 * Cross-tenant isolation safety net for the Fase D2 authorization layer.
 * Two venue accounts (A, B) — each owning a Venue + FloorPlan + TableType +
 * Template — and two couple accounts (X, Y) — each owning a Wedding + Guest,
 * X booked at A's venue, Y at B's. Every assertion exercises a helper directly.
 */

// Stable, unique ids so the seed is self-contained within the isolated test schema.
const A: Actor = { userId: "acc-venue-A", email: "venueA@test.pt", role: "venue" };
const B: Actor = { userId: "acc-venue-B", email: "venueB@test.pt", role: "venue" };
const X: Actor = { userId: "acc-couple-X", email: "coupleX@test.pt", role: "couple" };
const Y: Actor = { userId: "acc-couple-Y", email: "coupleY@test.pt", role: "couple" };

const seeded = {
  aVenue: "",
  bVenue: "",
  aFloorPlan: "",
  bFloorPlan: "",
  aTableType: "",
  bTableType: "",
  aTemplate: "",
  bTemplate: "",
  xWedding: "",
  yWedding: "",
  xGuest: "",
  yGuest: "",
};

/** Resolves to the thrown AccessError, or fails the test if nothing threw. */
async function expectDenied(promise: Promise<unknown>, status?: 403 | 404): Promise<AccessError> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(AccessError);
    const e = err as AccessError;
    if (status !== undefined) expect(e.status).toBe(status);
    return e;
  }
  throw new Error("Expected access to be denied, but it was allowed.");
}

async function seedVenueBundle(owner: Actor, tag: string) {
  const venue = await prisma.venue.create({ data: { name: `Venue ${tag}`, ownerId: owner.userId } });
  const floorPlan = await prisma.floorPlan.create({
    data: { venueId: venue.id, image: "", scale: 100, width: 10, depth: 10 },
  });
  const tableType = await prisma.tableType.create({
    data: { venueId: venue.id, name: `Round ${tag}`, shape: "round", minSeats: 6, maxSeats: 10, width: 1.5, depth: 1.5 },
  });
  const template = await prisma.layoutTemplate.create({
    data: { venueId: venue.id, name: `Template ${tag}`, minGuests: 50, maxGuests: 100 },
  });
  return { venue: venue.id, floorPlan: floorPlan.id, tableType: tableType.id, template: template.id };
}

beforeAll(async () => {
  await prisma.profile.createMany({
    data: [
      { id: A.userId, email: A.email!, role: "venue" },
      { id: B.userId, email: B.email!, role: "venue" },
      { id: X.userId, email: X.email!, role: "couple" },
      { id: Y.userId, email: Y.email!, role: "couple" },
    ],
  });

  const a = await seedVenueBundle(A, "A");
  const b = await seedVenueBundle(B, "B");
  seeded.aVenue = a.venue;
  seeded.aFloorPlan = a.floorPlan;
  seeded.aTableType = a.tableType;
  seeded.aTemplate = a.template;
  seeded.bVenue = b.venue;
  seeded.bFloorPlan = b.floorPlan;
  seeded.bTableType = b.tableType;
  seeded.bTemplate = b.template;

  const xWedding = await prisma.wedding.create({
    data: { couple: "Couple X", ownerId: X.userId, venueId: a.venue },
  });
  const yWedding = await prisma.wedding.create({
    data: { couple: "Couple Y", ownerId: Y.userId, venueId: b.venue },
  });
  seeded.xWedding = xWedding.id;
  seeded.yWedding = yWedding.id;
  seeded.xGuest = (await prisma.guest.create({ data: { weddingId: xWedding.id, name: "Guest X1" } })).id;
  seeded.yGuest = (await prisma.guest.create({ data: { weddingId: yWedding.id, name: "Guest Y1" } })).id;
});

describe("venue-owned access", () => {
  it("listVenuesFor(A) returns only A's venue, never B's", async () => {
    const venues = await listVenuesFor(A);
    const ids = venues.map((v) => v.id);
    expect(ids).toContain(seeded.aVenue);
    expect(ids).not.toContain(seeded.bVenue);
  });

  it("a venue actor can write its own venue but is denied another venue (404)", async () => {
    await expect(assertVenueAccess(A, seeded.aVenue, "write")).resolves.toBeUndefined();
    await expectDenied(assertVenueAccess(A, seeded.bVenue, "read"), 404);
    await expectDenied(assertVenueAccess(A, seeded.bVenue, "write"), 404);
  });

  it("resolves FloorPlan/Template/TableType ownership through venueId", async () => {
    await expect(assertFloorPlanAccess(A, seeded.aFloorPlan, "write")).resolves.toBeUndefined();
    await expect(assertTemplateAccess(A, seeded.aTemplate, "write")).resolves.toBeUndefined();
    await expect(assertTableTypeAccess(A, seeded.aTableType, "write")).resolves.toBeUndefined();
    await expectDenied(assertFloorPlanAccess(A, seeded.bFloorPlan, "read"), 404);
    await expectDenied(assertTemplateAccess(A, seeded.bTemplate, "write"), 404);
    await expectDenied(assertTableTypeAccess(A, seeded.bTableType, "write"), 404);
  });

  it("a couple can READ the venue it booked but never write it, and is blind to unrelated venues", async () => {
    await expect(assertVenueAccess(X, seeded.aVenue, "read")).resolves.toBeUndefined();
    await expectDenied(assertVenueAccess(X, seeded.aVenue, "write"), 403);
    await expectDenied(assertVenueAccess(X, seeded.bVenue, "read"), 404);
  });

  it("a couple's read grant flows through to the venue's floor plans and templates", async () => {
    await expect(assertFloorPlanAccess(X, seeded.aFloorPlan, "read")).resolves.toBeUndefined();
    await expect(assertTemplateAccess(X, seeded.aTemplate, "read")).resolves.toBeUndefined();
    await expectDenied(assertFloorPlanAccess(X, seeded.bFloorPlan, "read"), 404);
    await expectDenied(assertTemplateAccess(X, seeded.bTemplate, "read"), 404);
    await expectDenied(assertFloorPlanAccess(X, seeded.aFloorPlan, "write"), 403);
  });

  it("listFloorPlansFor scopes a couple to its booked venue's plans", async () => {
    const { listFloorPlansFor } = await import("./access");
    const plans = await listFloorPlansFor(X);
    const ids = plans.map((p) => p.id);
    expect(ids).toContain(seeded.aFloorPlan);
    expect(ids).not.toContain(seeded.bFloorPlan);
  });
});

describe("wedding-owned access", () => {
  it("listWeddingsFor: couple sees only its own; venue sees none", async () => {
    const xWeddings = await listWeddingsFor(X);
    const xIds = xWeddings.map((w) => w.id);
    expect(xIds).toContain(seeded.xWedding);
    expect(xIds).not.toContain(seeded.yWedding);
    expect(await listWeddingsFor(A)).toEqual([]);
  });

  it("a couple can read+write its own wedding; another couple's is hidden (404)", async () => {
    await expect(assertWeddingAccess(X, seeded.xWedding, "write")).resolves.toBeUndefined();
    await expectDenied(assertWeddingAccess(X, seeded.yWedding, "read"), 404);
  });

  it("a venue is denied all wedding access (403 — Fase E)", async () => {
    await expectDenied(assertWeddingAccess(A, seeded.xWedding, "read"), 403);
  });

  it("guest access resolves through weddingId — own ok, other couple's denied", async () => {
    await expect(assertGuestAccess(X, seeded.xGuest, "write")).resolves.toBeUndefined();
    await expectDenied(assertGuestAccess(X, seeded.yGuest, "read"), 404);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
