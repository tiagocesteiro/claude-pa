import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

/**
 * Fase D2b wedding-side data-tenancy: end-to-end cross-tenant isolation, proven
 * both at the helper level (access.ts) AND through the real route handlers.
 *
 * Seed: two couples X, Y — each owning a Wedding + Guest + Group + Constraint +
 * a Table(weddingId) — plus a venue account A. The route handlers resolve the
 * caller through the mocked `getActor`; we flip `authState.actor` per test.
 */

// The route handlers call requireActor() → getActor(); make it return whichever
// actor the current test is impersonating. `vi.hoisted` lets the mock factory
// (hoisted above imports) share this mutable ref safely.
const authState = vi.hoisted(() => ({
  actor: null as { userId: string; email: string | null; role: "couple" | "venue" | "admin" } | null,
}));
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => authState.actor,
}));

import { prisma } from "@/lib/db/client";
import type { Actor } from "@/lib/auth/actor";
import {
  AccessError,
  listWeddingsFor,
  listVenueBookings,
  assertWeddingAccess,
  assertGuestAccess,
  assertGroupAccess,
  assertConstraintAccess,
  assertTableAccess,
} from "@/lib/auth/access";
import { GET as listWeddings } from "./weddings/route";
import { GET as getWedding } from "./weddings/[id]/route";
import { GET as getPlan } from "./weddings/[id]/plan/route";
import { PATCH as patchGuest } from "./guests/[id]/route";
import { GET as getVenueBookings } from "./venue/bookings/route";

const X: Actor = { userId: "iso-couple-X", email: "isoX@test.pt", role: "couple" };
const Y: Actor = { userId: "iso-couple-Y", email: "isoY@test.pt", role: "couple" };
const A: Actor = { userId: "iso-venue-A", email: "isoA@test.pt", role: "venue" };

const s = {
  aVenue: "",
  xWedding: "",
  yWedding: "",
  xGuest: "",
  yGuest: "",
  xGroup: "",
  yGroup: "",
  xConstraint: "",
  yConstraint: "",
  xTable: "",
  yTable: "",
};

async function expectDenied(promise: Promise<unknown>, status?: 403 | 404) {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(AccessError);
    if (status !== undefined) expect((err as AccessError).status).toBe(status);
    return;
  }
  throw new Error("Expected access to be denied, but it was allowed.");
}

async function seedCouple(owner: Actor, tag: string, venueId?: string) {
  const wedding = await prisma.wedding.create({
    data: { couple: `Couple ${tag}`, ownerId: owner.userId, venueId: venueId ?? null },
  });
  const guestA = await prisma.guest.create({ data: { weddingId: wedding.id, name: `Guest ${tag}1` } });
  const guestB = await prisma.guest.create({ data: { weddingId: wedding.id, name: `Guest ${tag}2` } });
  const group = await prisma.group.create({ data: { weddingId: wedding.id, name: `Group ${tag}` } });
  const constraint = await prisma.constraint.create({
    data: { weddingId: wedding.id, type: "together", guestAId: guestA.id, guestBId: guestB.id },
  });
  const table = await prisma.table.create({
    data: { weddingId: wedding.id, shape: "round", capacity: 8, x: 0, y: 0, fixed: false },
  });
  return { wedding: wedding.id, guest: guestA.id, group: group.id, constraint: constraint.id, table: table.id };
}

beforeAll(async () => {
  await prisma.profile.createMany({
    data: [
      { id: X.userId, email: X.email!, role: "couple" },
      { id: Y.userId, email: Y.email!, role: "couple" },
      { id: A.userId, email: A.email!, role: "venue" },
    ],
  });
  const venue = await prisma.venue.create({ data: { name: "Iso Venue A", ownerId: A.userId } });
  s.aVenue = venue.id;

  const x = await seedCouple(X, "X", venue.id);
  const y = await seedCouple(Y, "Y");
  s.xWedding = x.wedding;
  s.xGuest = x.guest;
  s.xGroup = x.group;
  s.xConstraint = x.constraint;
  s.xTable = x.table;
  s.yWedding = y.wedding;
  s.yGuest = y.guest;
  s.yGroup = y.group;
  s.yConstraint = y.constraint;
  s.yTable = y.table;
});

describe("wedding-side isolation — helper level", () => {
  it("listWeddingsFor: couple X sees only X's; venue A sees none", async () => {
    const xIds = (await listWeddingsFor(X)).map((w) => w.id);
    expect(xIds).toContain(s.xWedding);
    expect(xIds).not.toContain(s.yWedding);
    expect(await listWeddingsFor(A)).toEqual([]);
  });

  it("couple X: own wedding read+write ok; Y's wedding denied (404)", async () => {
    await expect(assertWeddingAccess(X, s.xWedding, "write")).resolves.toBeUndefined();
    await expectDenied(assertWeddingAccess(X, s.yWedding, "read"), 404);
  });

  it("venue A is denied all wedding access (403 — Fase E)", async () => {
    await expectDenied(assertWeddingAccess(A, s.xWedding, "read"), 403);
  });

  it("sub-entity resolvers deny cross-tenant and allow own", async () => {
    await expect(assertGuestAccess(X, s.xGuest, "write")).resolves.toBeUndefined();
    await expect(assertGroupAccess(X, s.xGroup, "write")).resolves.toBeUndefined();
    await expect(assertConstraintAccess(X, s.xConstraint, "write")).resolves.toBeUndefined();
    await expect(assertTableAccess(X, s.xTable, "write")).resolves.toBeUndefined();

    await expectDenied(assertGuestAccess(X, s.yGuest, "write"), 404);
    await expectDenied(assertGroupAccess(X, s.yGroup, "write"), 404);
    await expectDenied(assertConstraintAccess(X, s.yConstraint, "write"), 404);
    await expectDenied(assertTableAccess(X, s.yTable, "write"), 404);
  });
});

describe("wedding-side isolation — route handlers", () => {
  const withActor = (a: Actor | null) => {
    authState.actor = a;
  };

  it("GET /api/weddings scopes the list to the caller", async () => {
    withActor(X);
    const res = await listWeddings();
    expect(res.status).toBe(200);
    const ids = (await res.json()).map((w: { id: string }) => w.id);
    expect(ids).toContain(s.xWedding);
    expect(ids).not.toContain(s.yWedding);
  });

  it("GET /api/weddings/[id]: X opening Y's wedding → 404, own → 200", async () => {
    withActor(X);
    const denied = await getWedding(new Request("http://x"), {
      params: Promise.resolve({ id: s.yWedding }),
    });
    expect(denied.status).toBe(404);

    const ok = await getWedding(new Request("http://x"), {
      params: Promise.resolve({ id: s.xWedding }),
    });
    expect(ok.status).toBe(200);
  });

  it("GET /api/weddings/[id]: a venue account is denied a wedding (403)", async () => {
    withActor(A);
    const res = await getWedding(new Request("http://x"), {
      params: Promise.resolve({ id: s.xWedding }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/guests/[id]: X editing Y's guest → 404, own → 200", async () => {
    withActor(X);
    const denied = await patchGuest(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ rsvp: "confirmed" }) }),
      { params: Promise.resolve({ id: s.yGuest }) }
    );
    expect(denied.status).toBe(404);

    const ok = await patchGuest(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ rsvp: "confirmed" }) }),
      { params: Promise.resolve({ id: s.xGuest }) }
    );
    expect(ok.status).toBe(200);
  });

  it("an unauthenticated caller gets 401", async () => {
    withActor(null);
    const res = await getWedding(new Request("http://x"), {
      params: Promise.resolve({ id: s.xWedding }),
    });
    expect(res.status).toBe(401);
  });
});

/**
 * Fase E — venue read-only PROGRESS oversight of weddings booked at its venue(s).
 * STRICT RGPD: the venue sees only status/counts, NEVER guest names/dietary/plan.
 */
describe("Fase E — venue booking oversight (PII-free)", () => {
  const VA: Actor = { userId: "fe-venue-A", email: "feVenueA@test.pt", role: "venue" };
  const VB: Actor = { userId: "fe-venue-B", email: "feVenueB@test.pt", role: "venue" };
  const CA: Actor = { userId: "fe-couple-A", email: "feCoupleA@test.pt", role: "couple" };
  const CB: Actor = { userId: "fe-couple-B", email: "feCoupleB@test.pt", role: "couple" };
  const SECRET = "TopSecretGuestName";

  const fe = { venueA: "", venueB: "", weddingA: "", weddingB: "" };

  beforeAll(async () => {
    await prisma.profile.createMany({
      data: [
        { id: VA.userId, email: VA.email!, role: "venue" },
        { id: VB.userId, email: VB.email!, role: "venue" },
        { id: CA.userId, email: CA.email!, role: "couple" },
        { id: CB.userId, email: CB.email!, role: "couple" },
      ],
    });
    const venueA = await prisma.venue.create({ data: { name: "FE Venue A", ownerId: VA.userId } });
    const venueB = await prisma.venue.create({ data: { name: "FE Venue B", ownerId: VB.userId } });
    fe.venueA = venueA.id;
    fe.venueB = venueB.id;

    // Wedding booked at A: 4 guests (2 confirmed, 1 pending, 1 declined), 2 seated,
    // plus a dinner table → arrangementPicked true, seatingDone false (2/4).
    const wA = await prisma.wedding.create({
      data: { couple: "Alice & Bob", ownerId: CA.userId, venueId: venueA.id, guestEstimate: 80 },
    });
    fe.weddingA = wA.id;
    const table = await prisma.table.create({
      data: { weddingId: wA.id, shape: "round", capacity: 8, x: 0, y: 0, fixed: false },
    });
    await prisma.guest.create({ data: { weddingId: wA.id, name: `${SECRET}1`, rsvp: "confirmed", assignedTableId: table.id, dietary: "vegan" } });
    await prisma.guest.create({ data: { weddingId: wA.id, name: `${SECRET}2`, rsvp: "confirmed", assignedTableId: table.id } });
    await prisma.guest.create({ data: { weddingId: wA.id, name: `${SECRET}3`, rsvp: "pending" } });
    await prisma.guest.create({ data: { weddingId: wA.id, name: `${SECRET}4`, rsvp: "declined" } });

    // Wedding booked at B — must never appear in A's oversight.
    const wB = await prisma.wedding.create({
      data: { couple: "Carol & Dan", ownerId: CB.userId, venueId: venueB.id },
    });
    fe.weddingB = wB.id;
    await prisma.guest.create({ data: { weddingId: wB.id, name: "Someone Else", rsvp: "confirmed" } });
  });

  it("listVenueBookings(A): correct counts + booleans, excludes B's wedding", async () => {
    const bookings = await listVenueBookings(VA);
    const ids = bookings.map((b) => b.id);
    expect(ids).toContain(fe.weddingA);
    expect(ids).not.toContain(fe.weddingB);

    const a = bookings.find((b) => b.id === fe.weddingA)!;
    expect(a.couple).toBe("Alice & Bob");
    expect(a.venueName).toBe("FE Venue A");
    expect(a.guestEstimate).toBe(80);
    expect(a.guests).toEqual({ total: 4, confirmed: 2, pending: 1, declined: 1, seated: 2 });
    expect(a.arrangementPicked).toBe(true);
    expect(a.seatingDone).toBe(false); // 2 of 4 seated
  });

  it("payload is counts-only — no guest name/dietary leaks anywhere", async () => {
    const bookings = await listVenueBookings(VA);
    const a = bookings.find((b) => b.id === fe.weddingA)!;
    // The guests summary carries ONLY count keys.
    expect(Object.keys(a.guests).sort()).toEqual(
      ["confirmed", "declined", "pending", "seated", "total"]
    );
    // No identifying keys on the booking object.
    expect(a).not.toHaveProperty("name");
    expect(a).not.toHaveProperty("dietary");
    // Strongest check: the seeded secret name / dietary never appear in the payload.
    const serialized = JSON.stringify(bookings);
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain("vegan");
  });

  it("GET /api/venue/bookings: couple → 403; venue A → only A's bookings", async () => {
    authState.actor = CA;
    const denied = await getVenueBookings();
    expect(denied.status).toBe(403);

    authState.actor = VA;
    const res = await getVenueBookings();
    expect(res.status).toBe(200);
    const ids = (await res.json()).map((b: { id: string }) => b.id);
    expect(ids).toContain(fe.weddingA);
    expect(ids).not.toContain(fe.weddingB);
  });

  it("sanity: venue A is STILL denied the wedding's PII routes (unchanged)", async () => {
    authState.actor = VA;
    const wedding = await getWedding(new Request("http://x"), {
      params: Promise.resolve({ id: fe.weddingA }),
    });
    expect(wedding.status).toBe(403);
    const plan = await getPlan(new Request("http://x"), {
      params: Promise.resolve({ id: fe.weddingA }),
    });
    expect(plan.status).toBe(403);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
