import { describe, it, expect, afterAll } from "vitest";
import { importGuests } from "./importGuests";
import { createWedding } from "../db/weddings";
import { listGroups } from "../db/groups";
import { listGuests } from "../db/guests";
import { prisma } from "../db/client";

it("creates groups from distinct names and links guests", async () => {
  const w = await createWedding({ couple: "Import Test" });
  const res = await importGuests(w.id, [
    { name: "Ana", group: "Família" },
    { name: "Bruno", group: "Família" },
    { name: "Carla", group: "Faculdade" },
    { name: "Diogo" },
  ]);
  expect(res).toEqual({ guests: 4, groups: 2 });

  const groups = await listGroups(w.id);
  expect(groups.map((g) => g.name).sort()).toEqual(["Faculdade", "Família"]);

  const guests = await listGuests(w.id);
  const familia = groups.find((g) => g.name === "Família")!;
  expect(guests.filter((x) => x.groupId === familia.id).length).toBe(2);
  expect(guests.find((x) => x.name === "Diogo")?.groupId).toBeNull();
});

it("reuses an existing group of the same name on a second import", async () => {
  const w = await createWedding({ couple: "Reuse Test" });
  await importGuests(w.id, [{ name: "A", group: "X" }]);
  const res = await importGuests(w.id, [{ name: "B", group: "X" }]);
  expect(res.groups).toBe(0); // X already existed → no new group
  expect((await listGroups(w.id)).filter((g) => g.name === "X").length).toBe(1);
});

afterAll(async () => { await prisma.$disconnect(); });
