import { it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { getProfile, upsertProfile, getOrCreateProfile } from "./profiles";
import { prisma } from "./client";

it("creates a profile via upsert and fetches it", async () => {
  const id = randomUUID();
  const created = await upsertProfile({ id, email: "quinta@example.com", role: "venue" });
  expect(created.id).toBe(id);
  expect(created.role).toBe("venue");

  const got = await getProfile(id);
  expect(got?.email).toBe("quinta@example.com");
});

it("upsertProfile updates email on an existing profile without changing role", async () => {
  const id = randomUUID();
  await upsertProfile({ id, email: "first@example.com", role: "couple" });
  const updated = await upsertProfile({ id, email: "second@example.com", role: "venue" });
  expect(updated.email).toBe("second@example.com");
  // update clause intentionally omits role — signup shouldn't silently change an existing role.
  expect(updated.role).toBe("couple");
});

it("getOrCreateProfile creates with the fallback role when missing", async () => {
  const id = randomUUID();
  const profile = await getOrCreateProfile({ id, email: "new@example.com" }, "venue");
  expect(profile.role).toBe("venue");
  expect(profile.email).toBe("new@example.com");
});

it("getOrCreateProfile returns the existing profile without changing its role", async () => {
  const id = randomUUID();
  await upsertProfile({ id, email: "existing@example.com", role: "admin" });
  const profile = await getOrCreateProfile({ id, email: "existing@example.com" }, "couple");
  expect(profile.role).toBe("admin");
});

it("getProfile returns null for an unknown id", async () => {
  const profile = await getProfile(randomUUID());
  expect(profile).toBeNull();
});

afterAll(async () => {
  await prisma.$disconnect();
});
