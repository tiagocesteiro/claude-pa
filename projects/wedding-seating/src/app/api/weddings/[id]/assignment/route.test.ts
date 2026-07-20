import { describe, it, expect, afterAll, vi } from "vitest";

// Fase D2b: route now requires an actor + tenancy check; mock an admin actor so
// these logic tests bypass ownership (existence still enforced).
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-admin", email: "admin@test.dev", role: "admin" }),
}));

import { PUT } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { listGuests } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

it("persists a manual assignment", async () => {
  const w = await createWedding({ couple: "Manual" });
  const g = await prisma.guest.create({ data: { weddingId: w.id, name: "A" } });
  const res = await PUT(
    new Request("http://x/assignment", {
      method: "PUT",
      body: JSON.stringify({ assignments: [{ guestId: g.id, tableId: "t9" }] }),
    }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(200);
  expect((await listGuests(w.id)).find((x) => x.id === g.id)?.assignedTableId).toBe("t9");
});

it("400s when assignments is not an array", async () => {
  const w = await createWedding({ couple: "Manual 400" });
  const res = await PUT(new Request("http://x/assignment", { method: "PUT", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
