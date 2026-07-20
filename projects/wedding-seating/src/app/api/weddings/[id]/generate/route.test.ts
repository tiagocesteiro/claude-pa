import { describe, it, expect, afterAll, vi } from "vitest";

// Fase D2b: route now requires an actor + tenancy check; mock an admin actor so
// these logic tests bypass ownership (existence still enforced).
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-admin", email: "admin@test.dev", role: "admin" }),
}));

import { POST } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { listGuests } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

it("generates and persists an assignment for all guests", async () => {
  const w = await createWedding({ couple: "Gen Test" });
  await prisma.guest.createMany({
    data: [
      { weddingId: w.id, name: "A" },
      { weddingId: w.id, name: "B" },
      { weddingId: w.id, name: "C" },
      { weddingId: w.id, name: "D" },
    ],
  });
  await prisma.table.createMany({
    data: [
      { weddingId: w.id, shape: "round", capacity: 2, x: 0, y: 0, fixed: false },
      { weddingId: w.id, shape: "round", capacity: 2, x: 1, y: 1, fixed: false },
    ],
  });

  const res = await POST(new Request("http://x/generate", { method: "POST", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(typeof body.score).toBe("number");
  expect(Array.isArray(body.warnings)).toBe(true);

  // every guest now has a table (4 guests, 2 tables x capacity 2 = fits exactly)
  const guests = await listGuests(w.id);
  expect(guests.every((g) => g.assignedTableId !== null)).toBe(true);
});

it("400s when the wedding has no tables yet", async () => {
  const w = await createWedding({ couple: "Gen 400" });
  const res = await POST(new Request("http://x/generate", { method: "POST", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toBe("aplica um template primeiro");
});

afterAll(async () => { await prisma.$disconnect(); });
