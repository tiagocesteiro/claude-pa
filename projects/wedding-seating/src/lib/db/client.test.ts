import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "./client";

describe("prisma client + test db", () => {
  it("connects and can round-trip a Venue", async () => {
    const v = await prisma.venue.create({ data: { name: "Quinta Teste" } });
    const found = await prisma.venue.findUnique({ where: { id: v.id } });
    expect(found?.name).toBe("Quinta Teste");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
