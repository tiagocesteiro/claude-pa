import { it, expect, afterAll } from "vitest";
import { GET } from "./route";
import { createVenue } from "@/lib/db/venues";
import { prisma } from "@/lib/db/client";

it("GET returns pickable venues as {id,name,location} for the couple picker", async () => {
  const created = await createVenue({ name: "Pickable Quinta", location: "Sintra", ownerId: "owner-x" });

  const list = (await (await GET()).json()) as { id: string; name: string; location: string | null }[];
  const found = list.find((v) => v.id === created.id);
  expect(found).toBeDefined();
  expect(found?.name).toBe("Pickable Quinta");
  expect(found?.location).toBe("Sintra");
  // The picker projection must NOT leak ownership/internal fields.
  expect(found).not.toHaveProperty("ownerId");
});

afterAll(async () => { await prisma.$disconnect(); });
