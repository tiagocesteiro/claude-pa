import { describe, it, expect, afterAll } from "vitest";
import { createWedding, getWedding } from "./weddings";
import { createGroup, listGroups, renameGroup, deleteGroup } from "./groups";
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

afterAll(async () => { await prisma.$disconnect(); });
