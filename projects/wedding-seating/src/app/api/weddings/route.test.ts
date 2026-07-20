import { it, expect, afterAll, vi } from "vitest";

// Fase D1: POST /api/weddings now requires a "couple" actor and stamps ownerId.
// Mock the actor so these unit tests run without a real Supabase session.
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-couple-owner", email: "couple@test.dev", role: "couple" }),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/db/client";

it("POST creates a wedding (with ownerId), GET lists it", async () => {
  const res = await POST(new Request("http://x/api/weddings", {
    method: "POST",
    body: JSON.stringify({ couple: "Ana & Bruno" }),
  }));
  expect(res.status).toBe(201);
  const created = await res.json();
  expect(created.couple).toBe("Ana & Bruno");
  expect(created.ownerId).toBe("test-couple-owner");
  const list = await (await GET()).json();
  expect(list.some((w: { id: string }) => w.id === created.id)).toBe(true);
});

it("POST rejects missing couple", async () => {
  const res = await POST(new Request("http://x/api/weddings", { method: "POST", body: "{}" }));
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
