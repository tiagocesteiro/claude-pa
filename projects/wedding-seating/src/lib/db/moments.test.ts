import { describe, it, expect, afterAll } from "vitest";
import { setMomentFloorPlan, setMomentNotes, setMomentTemplate, MOMENT_KINDS } from "./moments";
import { createWedding } from "./weddings";
import { prisma } from "./client";

it("setMomentFloorPlan upserts a moment's floor plan", async () => {
  const venue = await prisma.venue.create({ data: { name: "Moment Venue" } });
  const fp = await prisma.floorPlan.create({
    data: { venueId: venue.id, image: "img.png", scale: 50, width: 10, depth: 10 },
  });
  const w = await createWedding({ couple: "Moment Upsert", venueId: venue.id });

  const updated = await setMomentFloorPlan(w.id, "ceremony", fp.id);
  expect(updated?.floorPlanId).toBe(fp.id);

  const moments = await prisma.weddingMoment.findMany({ where: { weddingId: w.id } });
  expect(moments.length).toBe(4); // still 4 — upsert, not a duplicate row
  const ceremony = moments.find((m) => m.kind === "ceremony");
  expect(ceremony?.floorPlanId).toBe(fp.id);

  const cleared = await setMomentFloorPlan(w.id, "ceremony", null);
  expect(cleared?.floorPlanId).toBeNull();
});

it("setMomentFloorPlan rejects an invalid kind", async () => {
  const w = await createWedding({ couple: "Moment Bad Kind" });
  const result = await setMomentFloorPlan(w.id, "brunch", null);
  expect(result).toBeNull();
});

it("MOMENT_KINDS has exactly the four expected kinds", () => {
  expect([...MOMENT_KINDS].sort()).toEqual(["ceremony", "cocktail", "dance", "dinner"]);
});

it("setMomentTemplate upserts a moment's venue arrangement", async () => {
  const venue = await prisma.venue.create({ data: { name: "Moment Template Venue" } });
  const template = await prisma.layoutTemplate.create({
    data: { venueId: venue.id, name: "Cocktail A", minGuests: 20, maxGuests: 60 },
  });
  const w = await createWedding({ couple: "Moment Template Upsert", venueId: venue.id });

  const updated = await setMomentTemplate(w.id, "cocktail", template.id);
  expect(updated?.templateId).toBe(template.id);

  const moments = await prisma.weddingMoment.findMany({ where: { weddingId: w.id } });
  expect(moments.length).toBe(4); // still 4 — upsert, not a duplicate row
  const cocktail = moments.find((m) => m.kind === "cocktail");
  expect(cocktail?.templateId).toBe(template.id);

  const cleared = await setMomentTemplate(w.id, "cocktail", null);
  expect(cleared?.templateId).toBeNull();
});

it("setMomentTemplate rejects an invalid kind", async () => {
  const w = await createWedding({ couple: "Moment Template Bad Kind" });
  const result = await setMomentTemplate(w.id, "brunch", null);
  expect(result).toBeNull();
});

it("setMomentNotes upserts a moment's notes independently of its arrangement", async () => {
  const venue = await prisma.venue.create({ data: { name: "Moment Notes Venue" } });
  const template = await prisma.layoutTemplate.create({
    data: { venueId: venue.id, name: "Dance A", minGuests: 20, maxGuests: 60 },
  });
  const w = await createWedding({ couple: "Moment Notes Upsert", venueId: venue.id });
  await setMomentTemplate(w.id, "dance", template.id);

  const updated = await setMomentNotes(w.id, "dance", "Lembrar de reservar o DJ.");
  expect(updated?.notes).toBe("Lembrar de reservar o DJ.");
  // the arrangement set moments earlier is untouched by the notes-only upsert
  expect(updated?.templateId).toBe(template.id);

  const moments = await prisma.weddingMoment.findMany({ where: { weddingId: w.id } });
  expect(moments.length).toBe(4); // still 4 — upsert, not a duplicate row

  const cleared = await setMomentNotes(w.id, "dance", null);
  expect(cleared?.notes).toBeNull();
});

it("setMomentNotes rejects an invalid kind", async () => {
  const w = await createWedding({ couple: "Moment Notes Bad Kind" });
  const result = await setMomentNotes(w.id, "brunch", null);
  expect(result).toBeNull();
});

afterAll(async () => { await prisma.$disconnect(); });
