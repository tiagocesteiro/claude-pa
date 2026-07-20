import { describe, it, expect, afterAll, vi } from "vitest";

// Fase D2b: route now requires an actor + tenancy check; mock an admin actor so
// these logic tests bypass ownership (existence still enforced).
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-admin", email: "admin@test.dev", role: "admin" }),
}));

import { PUT } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { prisma } from "@/lib/db/client";

it("400s on an invalid moment kind", async () => {
  const w = await createWedding({ couple: "Moment Route Bad Kind" });
  const res = await PUT(
    new Request("http://x/moments/brunch", { method: "PUT", body: JSON.stringify({ floorPlanId: null }) }),
    { params: Promise.resolve({ id: w.id, kind: "brunch" }) }
  );
  expect(res.status).toBe(400);
});

it("400s when the floor plan belongs to a different venue than the wedding", async () => {
  const venueA = await prisma.venue.create({ data: { name: "Venue A" } });
  const venueB = await prisma.venue.create({ data: { name: "Venue B" } });
  const fpB = await prisma.floorPlan.create({
    data: { venueId: venueB.id, image: "img.png", scale: 50, width: 10, depth: 10 },
  });
  const w = await createWedding({ couple: "Moment Route Cross Venue", venueId: venueA.id });

  const res = await PUT(
    new Request("http://x/moments/ceremony", {
      method: "PUT",
      body: JSON.stringify({ floorPlanId: fpB.id }),
    }),
    { params: Promise.resolve({ id: w.id, kind: "ceremony" }) }
  );
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/quinta/);
});

it("persists a valid floor plan assignment for a moment", async () => {
  const venue = await prisma.venue.create({ data: { name: "Venue Valid" } });
  const fp = await prisma.floorPlan.create({
    data: { venueId: venue.id, image: "img.png", scale: 50, width: 10, depth: 10 },
  });
  const w = await createWedding({ couple: "Moment Route Valid", venueId: venue.id });

  const res = await PUT(
    new Request("http://x/moments/cocktail", {
      method: "PUT",
      body: JSON.stringify({ floorPlanId: fp.id }),
    }),
    { params: Promise.resolve({ id: w.id, kind: "cocktail" }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.floorPlanId).toBe(fp.id);

  const moment = await prisma.weddingMoment.findUnique({
    where: { weddingId_kind: { weddingId: w.id, kind: "cocktail" } },
  });
  expect(moment?.floorPlanId).toBe(fp.id);
});

it("clears a moment's floor plan with floorPlanId: null", async () => {
  const venue = await prisma.venue.create({ data: { name: "Venue Clear" } });
  const fp = await prisma.floorPlan.create({
    data: { venueId: venue.id, image: "img.png", scale: 50, width: 10, depth: 10 },
  });
  const w = await createWedding({ couple: "Moment Route Clear", venueId: venue.id });

  await PUT(
    new Request("http://x/moments/dance", { method: "PUT", body: JSON.stringify({ floorPlanId: fp.id }) }),
    { params: Promise.resolve({ id: w.id, kind: "dance" }) }
  );
  const res = await PUT(
    new Request("http://x/moments/dance", { method: "PUT", body: JSON.stringify({ floorPlanId: null }) }),
    { params: Promise.resolve({ id: w.id, kind: "dance" }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.floorPlanId).toBeNull();
});

it("400s when the template belongs to a different venue than the wedding", async () => {
  const venueA = await prisma.venue.create({ data: { name: "Tpl Venue A" } });
  const venueB = await prisma.venue.create({ data: { name: "Tpl Venue B" } });
  const templateB = await prisma.layoutTemplate.create({
    data: { venueId: venueB.id, name: "B Arrangement", minGuests: 10, maxGuests: 50 },
  });
  const w = await createWedding({ couple: "Moment Route Tpl Cross Venue", venueId: venueA.id });

  const res = await PUT(
    new Request("http://x/moments/cocktail", {
      method: "PUT",
      body: JSON.stringify({ templateId: templateB.id }),
    }),
    { params: Promise.resolve({ id: w.id, kind: "cocktail" }) }
  );
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/quinta/);
});

it("persists a valid template assignment for a moment", async () => {
  const venue = await prisma.venue.create({ data: { name: "Tpl Venue Valid" } });
  const template = await prisma.layoutTemplate.create({
    data: { venueId: venue.id, name: "Valid Arrangement", minGuests: 10, maxGuests: 50 },
  });
  const w = await createWedding({ couple: "Moment Route Tpl Valid", venueId: venue.id });

  const res = await PUT(
    new Request("http://x/moments/dance", {
      method: "PUT",
      body: JSON.stringify({ templateId: template.id }),
    }),
    { params: Promise.resolve({ id: w.id, kind: "dance" }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.templateId).toBe(template.id);

  const moment = await prisma.weddingMoment.findUnique({
    where: { weddingId_kind: { weddingId: w.id, kind: "dance" } },
  });
  expect(moment?.templateId).toBe(template.id);
});

it("clears a moment's template with templateId: null", async () => {
  const venue = await prisma.venue.create({ data: { name: "Tpl Venue Clear" } });
  const template = await prisma.layoutTemplate.create({
    data: { venueId: venue.id, name: "Clear Arrangement", minGuests: 10, maxGuests: 50 },
  });
  const w = await createWedding({ couple: "Moment Route Tpl Clear", venueId: venue.id });

  await PUT(
    new Request("http://x/moments/ceremony", { method: "PUT", body: JSON.stringify({ templateId: template.id }) }),
    { params: Promise.resolve({ id: w.id, kind: "ceremony" }) }
  );
  const res = await PUT(
    new Request("http://x/moments/ceremony", { method: "PUT", body: JSON.stringify({ templateId: null }) }),
    { params: Promise.resolve({ id: w.id, kind: "ceremony" }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.templateId).toBeNull();
});

it("persists a moment's notes independently of its templateId", async () => {
  const venue = await prisma.venue.create({ data: { name: "Notes Venue" } });
  const template = await prisma.layoutTemplate.create({
    data: { venueId: venue.id, name: "Notes Arrangement", minGuests: 10, maxGuests: 50 },
  });
  const w = await createWedding({ couple: "Moment Route Notes", venueId: venue.id });

  await PUT(
    new Request("http://x/moments/cocktail", {
      method: "PUT",
      body: JSON.stringify({ templateId: template.id }),
    }),
    { params: Promise.resolve({ id: w.id, kind: "cocktail" }) }
  );

  const res = await PUT(
    new Request("http://x/moments/cocktail", {
      method: "PUT",
      body: JSON.stringify({ notes: "Confirmar flores brancas." }),
    }),
    { params: Promise.resolve({ id: w.id, kind: "cocktail" }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.notes).toBe("Confirmar flores brancas.");
  // the templateId set moments earlier is untouched by the notes-only PUT
  expect(body.templateId).toBe(template.id);

  const cleared = await PUT(
    new Request("http://x/moments/cocktail", { method: "PUT", body: JSON.stringify({ notes: null }) }),
    { params: Promise.resolve({ id: w.id, kind: "cocktail" }) }
  );
  expect(cleared.status).toBe(200);
  const clearedBody = await cleared.json();
  expect(clearedBody.notes).toBeNull();
});

afterAll(async () => { await prisma.$disconnect(); });
