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
  assertWeddingAccess,
  assertGuestAccess,
  assertGroupAccess,
  assertConstraintAccess,
  assertTableAccess,
} from "@/lib/auth/access";
import { GET as listWeddings } from "./weddings/route";
import { GET as getWedding } from "./weddings/[id]/route";
import { PATCH as patchGuest } from "./guests/[id]/route";

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

afterAll(async () => {
  await prisma.$disconnect();
});
