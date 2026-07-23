import { it, expect, afterAll } from "vitest";
import { createVenueSpace, listVenueSpaces, updateVenueSpace, deleteVenueSpace, getVenueSpace } from "./venueSpaces";
import { assertVenueSpaceAccess, AccessError } from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

it("venue space CRUD", async () => {
  const venue = await prisma.venue.create({ data: { name: "Sp Venue", ownerId: "sp-owner" } });
  const s = await createVenueSpace(venue.id, { name: "Jardim da cerimónia" });
  expect(s.name).toBe("Jardim da cerimónia");
  expect(s.image).toBeNull();

  await updateVenueSpace(s.id, { image: "space-x/photo.jpg" });
  expect((await getVenueSpace(s.id))?.image).toBe("space-x/photo.jpg");

  await createVenueSpace(venue.id, { name: "Salão" });
  expect((await listVenueSpaces(venue.id)).length).toBe(2);

  await deleteVenueSpace(s.id);
  expect(await getVenueSpace(s.id)).toBeNull();
});

it("assertVenueSpaceAccess: only the owning venue may write", async () => {
  const venue = await prisma.venue.create({ data: { name: "Sp Own", ownerId: "spo-a" } });
  const s = await createVenueSpace(venue.id, { name: "Terraço" });

  const owner: Actor = { userId: "spo-a", email: "", role: "venue" };
  const stranger: Actor = { userId: "spo-b", email: "", role: "venue" };

  await expect(assertVenueSpaceAccess(owner, s.id, "write")).resolves.toBeUndefined();
  await expect(assertVenueSpaceAccess(stranger, s.id, "write")).rejects.toBeInstanceOf(AccessError);
});

afterAll(async () => {
  await prisma.$disconnect();
});
