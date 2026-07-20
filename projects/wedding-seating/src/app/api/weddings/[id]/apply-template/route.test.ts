import { describe, it, expect, afterAll, vi } from "vitest";

// Fase D2b: routes now require an actor + tenancy check; mock an admin actor so
// these logic tests bypass ownership (existence still enforced).
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-admin", email: "admin@test.dev", role: "admin" }),
}));

import { POST } from "./route";
import { GET as getPlan } from "../plan/route";
import { POST as generate } from "../generate/route";
import { createWedding } from "@/lib/db/weddings";
import { listGuests } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

async function seedTemplate() {
  const venue = await prisma.venue.create({ data: { name: "V AT" } });
  const fp = await prisma.floorPlan.create({
    data: { venueId: venue.id, image: "img.png", scale: 50, width: 10, depth: 10 },
  });
  const template = await prisma.layoutTemplate.create({
    data: { venueId: venue.id, floorPlanId: fp.id, name: "T", minGuests: 2, maxGuests: 4 },
  });
  await prisma.table.createMany({
    data: [
      { templateId: template.id, shape: "round", capacity: 2, x: 0, y: 0, fixed: false },
      { templateId: template.id, shape: "round", capacity: 2, x: 1, y: 1, fixed: false },
    ],
  });
  return { templateId: template.id, floorPlanImage: fp.image };
}

it("applies a template to a wedding, then plan/generate use the wedding's own tables", async () => {
  const w = await createWedding({ couple: "Apply Route Test" });
  const { templateId, floorPlanImage } = await seedTemplate();

  const res = await POST(
    new Request("http://x/apply-template", {
      method: "POST",
      body: JSON.stringify({ templateId }),
    }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.copied).toBe(2);

  const planRes = await getPlan(new Request("http://x/plan"), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(planRes.status).toBe(200);
  const plan = await planRes.json();
  expect(plan.tables.length).toBe(2);
  expect(plan.layout).not.toBeNull();
  expect(plan.layout.image).toBe(floorPlanImage);

  await prisma.guest.createMany({
    data: [
      { weddingId: w.id, name: "A" },
      { weddingId: w.id, name: "B" },
      { weddingId: w.id, name: "C" },
      { weddingId: w.id, name: "D" },
    ],
  });

  const genRes = await generate(new Request("http://x/generate", { method: "POST", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(genRes.status).toBe(200);

  const guests = await listGuests(w.id);
  expect(guests.every((g) => g.assignedTableId !== null)).toBe(true);
});

it("400s when templateId is missing", async () => {
  const w = await createWedding({ couple: "Apply 400" });
  const res = await POST(new Request("http://x/apply-template", { method: "POST", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(400);
});

it("404s when the template doesn't exist", async () => {
  const w = await createWedding({ couple: "Apply 404" });
  const res = await POST(
    new Request("http://x/apply-template", {
      method: "POST",
      body: JSON.stringify({ templateId: "nope" }),
    }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(404);
});

afterAll(async () => {
  await prisma.$disconnect();
});
