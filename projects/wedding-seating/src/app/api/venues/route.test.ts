import { it, expect, afterAll, vi } from "vitest";

// Fase D1: POST /api/venues now requires a "venue" actor and stamps ownerId.
// Mock the actor so these unit tests run without a real Supabase session.
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-venue-owner", email: "venue@test.dev", role: "venue" }),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db/client";

it("POST creates a venue (with ownerId) and GET lists it", async () => {
  const res = await POST(new Request("http://x/api/venues", {
    method: "POST",
    body: JSON.stringify({ name: "API Quinta", location: "Cascais" }),
  }));
  expect(res.status).toBe(201);
  const created = await res.json();
  expect(created.name).toBe("API Quinta");
  expect(created.ownerId).toBe("test-venue-owner");

  const list = await (await GET()).json();
  expect(list.some((v: { id: string }) => v.id === created.id)).toBe(true);
});

it("POST rejects a missing name", async () => {
  const res = await POST(new Request("http://x/api/venues", { method: "POST", body: "{}" }));
  expect(res.status).toBe(400);
});

it("POST returns 400 (not 500) on an empty body", async () => {
  const res = await POST(new Request("http://x/api/venues", { method: "POST", body: "" }));
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
