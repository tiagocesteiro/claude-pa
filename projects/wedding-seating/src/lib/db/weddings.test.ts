import { describe, it, expect, afterAll } from "vitest";
import { createWedding, getWedding, getWeddingDetail, updateWedding } from "./weddings";
import { createGroup, listGroups, renameGroup, deleteGroup } from "./groups";
import { MOMENT_KINDS } from "./moments";
import { prisma } from "./client";

it("creates a wedding and manages its groups", async () => {
  const w = await createWedding({ couple: "Ana & Bruno" });
  expect((await getWedding(w.id))?.couple).toBe("Ana & Bruno");

  const g = await createGroup({ weddingId: w.id, name: "Família" });
  const renamed = await renameGroup(g.id, "Família da Noiva");
  expect(renamed.name).toBe("Família da Noiva");
  expect((await listGroups(w.id)).length).toBe(1);

  await deleteGroup(g.id);
  expect((await listGroups(w.id)).length).toBe(0);
});

it("createWedding seeds the 4 moments (ceremony, cocktail, dinner, dance)", async () => {
  const w = await createWedding({ couple: "Moments Seed" });
  const detail = await getWeddingDetail(w.id);
  expect(detail?.moments.length).toBe(4);
  const kinds = detail?.moments.map((m) => m.kind).sort();
  expect(kinds).toEqual([...MOMENT_KINDS].sort());
  expect(detail?.moments.every((m) => m.floorPlanId === null)).toBe(true);
});

it("getWeddingDetail includes the venue and each moment's floor plan", async () => {
  const venue = await prisma.venue.create({ data: { name: "Detail Venue" } });
  const w = await createWedding({ couple: "Detail Test", venueId: venue.id });
  const detail = await getWeddingDetail(w.id);
  expect(detail?.venue?.id).toBe(venue.id);
  expect(detail?.moments.length).toBe(4);
});

it("updateWedding whitelists fields — unknown fields are ignored, known fields persist", async () => {
  const w = await createWedding({ couple: "Whitelist Test" });
  const updated = await updateWedding(w.id, {
    couple: "Whitelist Updated",
    notes: "Some notes",
    // @ts-expect-error — templateId is intentionally not part of WeddingDetailFields
    templateId: "should-not-be-settable",
  });
  expect(updated.couple).toBe("Whitelist Updated");
  expect(updated.notes).toBe("Some notes");
  expect(updated.templateId).toBeNull();

  const reloaded = await getWedding(w.id);
  expect(reloaded?.couple).toBe("Whitelist Updated");
  expect(reloaded?.notes).toBe("Some notes");
});

it("updateWedding coerces guestEstimate and clears fields with null", async () => {
  const w = await createWedding({ couple: "Estimate Test", guestEstimate: 50 });
  const updated = await updateWedding(w.id, { guestEstimate: 120, partner1: null });
  expect(updated.guestEstimate).toBe(120);
  expect(updated.partner1).toBeNull();
});

afterAll(async () => { await prisma.$disconnect(); });
