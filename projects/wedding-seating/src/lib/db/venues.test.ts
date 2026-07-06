import { describe, it, expect, afterAll } from "vitest";
import { createVenue, listVenues, getVenue } from "./venues";
import { prisma } from "./client";

it("creates and fetches a venue", async () => {
  const v = await createVenue({ name: "Quinta A", location: "Sintra" });
  expect(v.id).toBeTruthy();
  const got = await getVenue(v.id);
  expect(got?.location).toBe("Sintra");
});

it("lists venues newest first", async () => {
  const a = await createVenue({ name: "First" });
  const b = await createVenue({ name: "Second" });
  const all = await listVenues();
  const idxA = all.findIndex((v) => v.id === a.id);
  const idxB = all.findIndex((v) => v.id === b.id);
  expect(idxB).toBeLessThan(idxA);
});

afterAll(async () => { await prisma.$disconnect(); });
