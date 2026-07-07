import { describe, it, expect, afterAll } from "vitest";
import { POST } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { listGuests } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

async function seedFloorPlan() {
  const venue = await prisma.venue.create({ data: { name: "V" } });
  const fp = await prisma.floorPlan.create({
    data: { venueId: venue.id, image: "x", scale: 50, width: 10, depth: 10 },
  });
  await prisma.table.createMany({
    data: [
      { floorPlanId: fp.id, shape: "round", capacity: 2, x: 0, y: 0, fixed: false },
      { floorPlanId: fp.id, shape: "round", capacity: 2, x: 1, y: 1, fixed: false },
    ],
  });
  return fp.id;
}

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
  const floorPlanId = await seedFloorPlan();

  const res = await POST(
    new Request("http://x/generate", { method: "POST", body: JSON.stringify({ floorPlanId }) }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(typeof body.score).toBe("number");
  expect(Array.isArray(body.warnings)).toBe(true);

  // every guest now has a table (4 guests, 2 tables x capacity 2 = fits exactly)
  const guests = await listGuests(w.id);
  expect(guests.every((g) => g.assignedTableId !== null)).toBe(true);
});

it("400s when floorPlanId is missing", async () => {
  const w = await createWedding({ couple: "Gen 400" });
  const res = await POST(new Request("http://x/generate", { method: "POST", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
