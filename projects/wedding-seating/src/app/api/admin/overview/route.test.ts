import { it, expect, describe, beforeAll, afterAll, vi } from "vitest";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "@/lib/db/client";

// Control the acting role per test. requireActor (via guard) calls getActor.
let mockActor: Actor | null = null;
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => mockActor,
}));

import { GET } from "./route";

const ADMIN: Actor = { userId: "ovw-admin", email: "admin@ovw.pt", role: "admin" };
const COUPLE: Actor = { userId: "ovw-couple", email: "couple@ovw.pt", role: "couple" };
const VENUE: Actor = { userId: "ovw-venue", email: "venue@ovw.pt", role: "venue" };

const seeded = { venueId: "", weddingId: "" };

beforeAll(async () => {
  await prisma.profile.createMany({
    data: [
      { id: "ovw-owner-venue", email: "vowner@ovw.pt", role: "venue" },
      { id: "ovw-owner-couple", email: "cowner@ovw.pt", role: "couple" },
    ],
  });
  const venue = await prisma.venue.create({
    data: { name: "Overview Venue", location: "Sintra", ownerId: "ovw-owner-venue" },
  });
  await prisma.floorPlan.create({ data: { venueId: venue.id, image: "", scale: 100, width: 10, depth: 10 } });
  await prisma.layoutTemplate.create({ data: { venueId: venue.id, name: "T", minGuests: 10, maxGuests: 50 } });
  const wedding = await prisma.wedding.create({
    data: { couple: "Overview Couple", ownerId: "ovw-owner-couple", venueId: venue.id },
  });
  await prisma.guest.createMany({
    data: [
      { weddingId: wedding.id, name: "G1", rsvp: "confirmed" },
      { weddingId: wedding.id, name: "G2", rsvp: "pending" },
    ],
  });
  seeded.venueId = venue.id;
  seeded.weddingId = wedding.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/admin/overview", () => {
  it("admin gets all venues + weddings with ownerEmail + counts", async () => {
    mockActor = ADMIN;
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      venues: Array<Record<string, unknown>>;
      weddings: Array<Record<string, unknown>>;
    };

    const v = body.venues.find((x) => x.id === seeded.venueId)!;
    expect(v).toBeTruthy();
    expect(v.ownerEmail).toBe("vowner@ovw.pt");
    expect(v.floorPlanCount).toBe(1);
    expect(v.templateCount).toBe(1);
    expect(v.weddingCount).toBe(1);

    const w = body.weddings.find((x) => x.id === seeded.weddingId)! as {
      ownerEmail: string;
      venueName: string;
      guests: { total: number; confirmed: number; pending: number };
    };
    expect(w).toBeTruthy();
    expect(w.ownerEmail).toBe("cowner@ovw.pt");
    expect(w.venueName).toBe("Overview Venue");
    expect(w.guests.total).toBe(2);
    expect(w.guests.confirmed).toBe(1);
    expect(w.guests.pending).toBe(1);
  });

  it("a couple actor is denied (403)", async () => {
    mockActor = COUPLE;
    expect((await GET()).status).toBe(403);
  });

  it("a venue actor is denied (403)", async () => {
    mockActor = VENUE;
    expect((await GET()).status).toBe(403);
  });

  it("a logged-out request is 401", async () => {
    mockActor = null;
    expect((await GET()).status).toBe(401);
  });
});
