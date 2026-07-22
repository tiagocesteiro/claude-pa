import { it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { createSupplierInvite, createCoupleInvite, getInvitePreview, acceptInvite } from "./invites";
import { getParticipant } from "./participants";
import { getWeddingRole } from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

it("supplier invite: issue → preview → accept links participant + supplier account", async () => {
  const venue = await prisma.venue.create({ data: { name: "Inv Venue", ownerId: "iv-owner" } });
  const w = await createWedding({ couple: "Inv Couple", venueId: venue.id, ownerId: "iv-couple" });
  const supplier = await prisma.supplier.create({ data: { weddingId: w.id, name: "DJ Beat" } });

  const token = await createSupplierInvite(w.id, supplier.id, { email: "dj@x.pt", service: "dj" });
  expect((await prisma.supplier.findUnique({ where: { id: supplier.id } }))?.inviteToken).toBe(token);

  const preview = await getInvitePreview(token);
  expect(preview?.role).toBe("supplier");
  expect(preview?.service).toBe("dj");
  expect(preview?.wedding.couple).toBe("Inv Couple");

  const inv = await acceptInvite(token, "dj-profile");
  expect(inv?.weddingId).toBe(w.id);

  const part = await getParticipant(w.id, "dj-profile");
  expect(part?.role).toBe("supplier");
  expect(part?.supplierId).toBe(supplier.id);
  expect((await prisma.supplier.findUnique({ where: { id: supplier.id } }))?.profileId).toBe("dj-profile");

  const djActor: Actor = { userId: "dj-profile", email: "", role: "supplier" };
  const wr = await getWeddingRole(djActor, w.id);
  expect(wr?.role).toBe("supplier");
  expect(wr?.service).toBe("dj");
});

it("couple invite: issue → accept creates couple participant", async () => {
  const w = await createWedding({ couple: "Couple Inv" });
  const token = await createCoupleInvite(w.id, "noivos@x.pt");
  const inv = await acceptInvite(token, "couple-profile");
  expect(inv?.role).toBe("couple");
  expect((await getParticipant(w.id, "couple-profile"))?.role).toBe("couple");
});

it("invalid + expired tokens are rejected", async () => {
  expect(await getInvitePreview("nope")).toBeNull();
  expect(await acceptInvite("nope", "x")).toBeNull();

  const w = await createWedding({ couple: "Expired" });
  const token = await createCoupleInvite(w.id, null);
  await prisma.weddingInvite.updateMany({ where: { token }, data: { expiresAt: new Date(Date.now() - 1000) } });
  expect(await getInvitePreview(token)).toBeNull();
  expect(await acceptInvite(token, "late")).toBeNull();
  expect(await getParticipant(w.id, "late")).toBeNull();
});

afterAll(async () => {
  await prisma.$disconnect();
});
