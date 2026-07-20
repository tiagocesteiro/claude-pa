import { describe, it, expect, afterAll, vi } from "vitest";

// Fase D2a: these routes now require an authenticated actor. Mock an admin actor
// (passes every venue-access check); cross-tenant isolation is covered in
// src/lib/auth/access.test.ts.
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "admin-test", email: "admin@test.dev", role: "admin" }),
}));

import { GET, POST } from "./route";
import { PATCH } from "@/app/api/table-types/[id]/route";
import { prisma } from "@/lib/db/client";

it("POST creates a table type; GET lists it", async () => {
  const v = await prisma.venue.create({ data: { name: "V API" } });
  const res = await POST(
    new Request("http://x/tt", { method: "POST", body: JSON.stringify({ name: "R8", shape: "round", minSeats: 6, maxSeats: 8, width: 1.5, depth: 1.5, quantity: 5 }) }),
    { params: Promise.resolve({ id: v.id }) }
  );
  expect(res.status).toBe(201);
  const list = await (await GET(new Request("http://x/tt"), { params: Promise.resolve({ id: v.id }) })).json();
  expect(list.some((t: { name: string }) => t.name === "R8")).toBe(true);
});

it("POST rejects missing name", async () => {
  const v = await prisma.venue.create({ data: { name: "V API2" } });
  const res = await POST(new Request("http://x/tt", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: v.id }) });
  expect(res.status).toBe(400);
});

it("PATCH whitelists editable fields; ignores venueId (mass-assignment guard)", async () => {
  const originalVenue = await prisma.venue.create({ data: { name: "V Original" } });
  const otherVenue = await prisma.venue.create({ data: { name: "V Other" } });
  const created = await prisma.tableType.create({
    data: { venueId: originalVenue.id, name: "R6", shape: "round", minSeats: 4, maxSeats: 6, width: 1.2, depth: 1.2, quantity: 3 },
  });

  const res = await PATCH(
    new Request("http://x/table-types/" + created.id, {
      method: "PATCH",
      body: JSON.stringify({ quantity: 9, venueId: otherVenue.id }),
    }),
    { params: Promise.resolve({ id: created.id }) }
  );
  expect(res.status).toBe(200);

  const updated = await prisma.tableType.findUniqueOrThrow({ where: { id: created.id } });
  expect(updated.quantity).toBe(9);
  expect(updated.venueId).toBe(originalVenue.id);
});

afterAll(async () => { await prisma.$disconnect(); });
