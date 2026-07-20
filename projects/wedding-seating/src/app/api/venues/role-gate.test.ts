import { it, expect, afterAll, vi } from "vitest";

// A couple account must NOT be able to create a venue → 403.
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "a-couple", email: "couple@test.dev", role: "couple" }),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db/client";

it("POST /api/venues rejects a couple account with 403", async () => {
  const res = await POST(new Request("http://x/api/venues", {
    method: "POST",
    body: JSON.stringify({ name: "Should Fail" }),
  }));
  expect(res.status).toBe(403);
});

afterAll(async () => { await prisma.$disconnect(); });
