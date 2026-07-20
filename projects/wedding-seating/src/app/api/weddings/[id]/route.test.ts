import { describe, it, expect, afterAll, vi } from "vitest";

// Fase D2b: routes now require an actor + tenancy check; mock an admin actor so
// these logic tests bypass ownership (existence still enforced).
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-admin", email: "admin@test.dev", role: "admin" }),
}));

import { GET, PATCH } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { prisma } from "@/lib/db/client";

it("GET returns the wedding detail (venue + moments) and 404s when missing", async () => {
  const venue = await prisma.venue.create({ data: { name: "Detail Route Venue" } });
  const w = await createWedding({ couple: "Detail Route Test", venueId: venue.id });

  const res = await GET(new Request("http://x/api/weddings/id"), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.couple).toBe("Detail Route Test");
  expect(body.venue.id).toBe(venue.id);
  expect(body.moments.length).toBe(4);

  const missing = await GET(new Request("http://x/api/weddings/id"), {
    params: Promise.resolve({ id: "does-not-exist" }),
  });
  expect(missing.status).toBe(404);
});

it("PATCH whitelists fields — unknown ignored, known persisted", async () => {
  const w = await createWedding({ couple: "Patch Route Test" });

  const res = await PATCH(
    new Request("http://x/api/weddings/id", {
      method: "PATCH",
      body: JSON.stringify({ couple: "Patched Couple", notes: "hello", templateId: "hacked" }),
    }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.couple).toBe("Patched Couple");
  expect(body.notes).toBe("hello");
  expect(body.templateId).toBeNull();
});

it("PATCH 400s when body has no known field", async () => {
  const w = await createWedding({ couple: "Patch Empty Test" });
  const res = await PATCH(
    new Request("http://x/api/weddings/id", { method: "PATCH", body: JSON.stringify({ bogus: 1 }) }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
