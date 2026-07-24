import { it, expect, afterAll } from "vitest";
import { createVenueSpace, listVenueSpaces, updateVenueSpace, deleteVenueSpace, getVenueSpace } from "./venueSpaces";
import { createWedding } from "./weddings";
import { updateMoment } from "./moments";
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

it("a moment can be linked to a venue space (spaceId + hero image)", async () => {
  const venue = await prisma.venue.create({ data: { name: "Link Venue", ownerId: "lk-owner" } });
  const space = await createVenueSpace(venue.id, { name: "Salão" });
  await updateVenueSpace(space.id, { image: "space-1/hall.jpg" });
  const w = await createWedding({ couple: "Link", venueId: venue.id });
  const moment = await prisma.weddingMoment.findFirstOrThrow({ where: { weddingId: w.id }, orderBy: { order: "asc" } });

  const updated = await updateMoment(moment.id, { spaceId: space.id, image: "space-1/hall.jpg" });
  expect(updated.spaceId).toBe(space.id);
  expect(updated.image).toBe("space-1/hall.jpg");

  // Clearing the space clears the link.
  const cleared = await updateMoment(moment.id, { spaceId: null, image: null });
  expect(cleared.spaceId).toBeNull();
  expect(cleared.image).toBeNull();
});

afterAll(async () => {
  await prisma.$disconnect();
});
