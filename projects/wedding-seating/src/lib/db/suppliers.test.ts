import { it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { createSupplier, findDuplicateSupplier } from "./suppliers";
import { prisma } from "./client";

it("findDuplicateSupplier matches name case-insensitively within the same service", async () => {
  const w = await createWedding({ couple: "Dedup" });
  await createSupplier(w.id, { name: "Prime Catering", service: "catering" });

  expect(await findDuplicateSupplier(w.id, "prime catering", "catering")).not.toBeNull(); // case-insensitive
  expect(await findDuplicateSupplier(w.id, "Prime Catering", "dj")).toBeNull(); // different service
  expect(await findDuplicateSupplier(w.id, "Outro Nome", "catering")).toBeNull(); // different name

  // Not cross-wedding.
  const other = await createWedding({ couple: "Other" });
  expect(await findDuplicateSupplier(other.id, "Prime Catering", "catering")).toBeNull();
});

afterAll(async () => {
  await prisma.$disconnect();
});
