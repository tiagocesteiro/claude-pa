import { it, expect, describe, afterEach, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { getProfile } from "@/lib/db/profiles";

// getActor resolves the Supabase user via serverClient — stub it so we control
// who is "logged in" without a real session.
let currentUser: { id: string; email: string | null } | null = null;
vi.mock("@/lib/supabase/serverClient", () => ({
  getCurrentUser: async () => currentUser,
}));

import { getActor } from "./actor";

const orig = process.env.ADMIN_EMAILS;
afterEach(() => {
  if (orig === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = orig;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("getActor + ADMIN_EMAILS promotion", () => {
  it("promotes an allowlisted email to admin and persists the role", async () => {
    const id = randomUUID();
    const email = `admin-${id}@example.com`;
    process.env.ADMIN_EMAILS = email;
    currentUser = { id, email };

    const actor = await getActor();
    expect(actor?.role).toBe("admin");

    // persisted to the Profile, so it stays consistent across requests
    expect((await getProfile(id))?.role).toBe("admin");
  });

  it("does NOT promote an email that is not on the allowlist (stays its real role)", async () => {
    const id = randomUUID();
    const email = `couple-${id}@example.com`;
    process.env.ADMIN_EMAILS = "someone-else@example.com";
    currentUser = { id, email };

    const actor = await getActor();
    expect(actor?.role).toBe("couple"); // default fallback role, unchanged
    expect((await getProfile(id))?.role).toBe("couple");
  });

  it("returns null when logged out", async () => {
    currentUser = null;
    expect(await getActor()).toBeNull();
  });
});
