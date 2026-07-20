import { describe, it, expect, afterAll, vi } from "vitest";

// Fase D2b: routes now require an actor + tenancy check; mock an admin actor so
// these logic tests bypass ownership (existence still enforced).
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-admin", email: "admin@test.dev", role: "admin" }),
}));

import { GET, POST } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { prisma } from "@/lib/db/client";

it("POST creates a guest; GET lists it", async () => {
  const w = await createWedding({ couple: "Guest POST" });
  const res = await POST(
    new Request("http://x/guests", { method: "POST", body: JSON.stringify({ name: "Nova Pessoa" }) }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(201);
  const list = await (await GET(new Request("http://x/guests"), { params: Promise.resolve({ id: w.id }) })).json();
  expect(list.some((g: { name: string }) => g.name === "Nova Pessoa")).toBe(true);
});

it("POST rejects missing name", async () => {
  const w = await createWedding({ couple: "Guest 400" });
  const res = await POST(new Request("http://x/guests", { method: "POST", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
