import { describe, it, expect, afterAll } from "vitest";
import { createConstraint, listConstraints, deleteConstraint } from "./constraints";
import { createWedding } from "./weddings";
import { prisma } from "./client";

it("creates, lists and deletes constraints", async () => {
  const w = await createWedding({ couple: "Constraint Test" });
  const a = await prisma.guest.create({ data: { weddingId: w.id, name: "A" } });
  const b = await prisma.guest.create({ data: { weddingId: w.id, name: "B" } });

  const c = await createConstraint({ weddingId: w.id, type: "separate", guestAId: a.id, guestBId: b.id });
  expect((await listConstraints(w.id)).length).toBe(1);

  await deleteConstraint(c.id);
  expect((await listConstraints(w.id)).length).toBe(0);
});

afterAll(async () => { await prisma.$disconnect(); });
