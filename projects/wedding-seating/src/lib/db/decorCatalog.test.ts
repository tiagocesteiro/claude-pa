import { it, expect, afterAll } from "vitest";
import { createDecorItem, createSupplierDecorItem, listDecorItems, listSupplierDecorItems } from "./decorCatalog";
import { assertDecorItemAccess, AccessError } from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

it("venue and supplier decor catalogs are separate", async () => {
  const venue = await prisma.venue.create({ data: { name: "Decor Venue", ownerId: "d-venue" } });
  const vItem = await createDecorItem(venue.id, { name: "Velas", category: "Mesa", quantity: 20 });
  expect(vItem.ownerRole).toBe("venue");

  const sItem = await createSupplierDecorItem("d-sup", { name: "Arco floral", price: 150, quantity: 2 });
  expect(sItem.ownerRole).toBe("supplier");
  expect(sItem.supplierProfileId).toBe("d-sup");
  expect(sItem.venueId).toBeNull();

  // Each catalog lists only its own.
  const vList = await listDecorItems(venue.id);
  expect(vList.map((i) => i.name)).toEqual(["Velas"]);
  const sList = await listSupplierDecorItems("d-sup");
  expect(sList.map((i) => i.name)).toEqual(["Arco floral"]);
  expect((await listSupplierDecorItems("other-sup")).length).toBe(0);
});

it("assertDecorItemAccess: venue-owned vs supplier-owned", async () => {
  const venue = await prisma.venue.create({ data: { name: "DA Venue", ownerId: "da-owner" } });
  const vItem = await createDecorItem(venue.id, { name: "Toalhas" });
  const sItem = await createSupplierDecorItem("da-sup", { name: "Candelabro" });

  const venueOwner: Actor = { userId: "da-owner", email: "", role: "venue" };
  const stranger: Actor = { userId: "da-other", email: "", role: "venue" };
  const supOwner: Actor = { userId: "da-sup", email: "", role: "supplier" };
  const supStranger: Actor = { userId: "da-sup2", email: "", role: "supplier" };

  await expect(assertDecorItemAccess(venueOwner, vItem.id, "write")).resolves.toBeUndefined();
  await expect(assertDecorItemAccess(stranger, vItem.id, "write")).rejects.toBeInstanceOf(AccessError);

  await expect(assertDecorItemAccess(supOwner, sItem.id, "write")).resolves.toBeUndefined();
  await expect(assertDecorItemAccess(supStranger, sItem.id, "write")).rejects.toBeInstanceOf(AccessError);
  await expect(assertDecorItemAccess(venueOwner, sItem.id, "read")).rejects.toBeInstanceOf(AccessError);
});

afterAll(async () => {
  await prisma.$disconnect();
});
