import { it, expect, afterAll } from "vitest";
import {
  createVenueTemplate,
  createSupplierTemplate,
  listRequirementTemplates,
  listSupplierTemplates,
  updateRequirementTemplate,
  deleteRequirementTemplate,
  getRequirementTemplate,
} from "./requirementTemplates";
import { assertRequirementTemplateAccess, AccessError } from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

it("venue template CRUD (venue-owned)", async () => {
  const venue = await prisma.venue.create({ data: { name: "T Venue", ownerId: "t-owner" } });
  const t = await createVenueTemplate(venue.id, {
    kind: "request", service: "catering", title: "Confirmar nº de mesas", data: { tables: 8 },
  });
  expect(t.ownerRole).toBe("venue");
  expect(t.service).toBe("catering");
  expect(t.data).toEqual({ tables: 8 });

  const q = await createVenueTemplate(venue.id, { kind: "question", service: null, title: "Fornece toalhas?" });
  expect(q.kind).toBe("question");

  expect((await listRequirementTemplates(venue.id)).length).toBe(2);
  await updateRequirementTemplate(t.id, { title: "Mesas + metros" });
  expect((await getRequirementTemplate(t.id))?.title).toBe("Mesas + metros");
  await deleteRequirementTemplate(q.id);
  expect(await getRequirementTemplate(q.id)).toBeNull();
});

it("supplier template CRUD (owned by the supplier account, separate from venues)", async () => {
  const t = await createSupplierTemplate("sup-prof-1", { kind: "request", targetRole: "venue", title: "Preciso de acesso 2h antes" });
  expect(t.ownerRole).toBe("supplier");
  expect(t.supplierProfileId).toBe("sup-prof-1");
  expect(t.targetRole).toBe("venue");
  expect(t.venueId).toBeNull();

  const toCouple = await createSupplierTemplate("sup-prof-1", { kind: "question", targetRole: "couple", title: "Cores do bouquet?" });
  expect(toCouple.targetRole).toBe("couple");

  const mine = await listSupplierTemplates("sup-prof-1");
  expect(mine.length).toBe(2);
  // Another supplier account sees none of them.
  expect((await listSupplierTemplates("sup-prof-2")).length).toBe(0);
});

it("assertRequirementTemplateAccess: venue-owned vs supplier-owned", async () => {
  const venue = await prisma.venue.create({ data: { name: "Own Venue", ownerId: "own-a" } });
  const vt = await createVenueTemplate(venue.id, { title: "X", service: "dj" });
  const st = await createSupplierTemplate("own-sup", { title: "Y", targetRole: "venue" });

  const venueOwner: Actor = { userId: "own-a", email: "", role: "venue" };
  const stranger: Actor = { userId: "own-b", email: "", role: "venue" };
  const supOwner: Actor = { userId: "own-sup", email: "", role: "supplier" };
  const supStranger: Actor = { userId: "own-sup2", email: "", role: "supplier" };

  // Venue template: only the owning venue.
  await expect(assertRequirementTemplateAccess(venueOwner, vt.id, "write")).resolves.toBeUndefined();
  await expect(assertRequirementTemplateAccess(stranger, vt.id, "write")).rejects.toBeInstanceOf(AccessError);

  // Supplier template: only the owning supplier account.
  await expect(assertRequirementTemplateAccess(supOwner, st.id, "write")).resolves.toBeUndefined();
  await expect(assertRequirementTemplateAccess(supStranger, st.id, "write")).rejects.toBeInstanceOf(AccessError);
  await expect(assertRequirementTemplateAccess(venueOwner, st.id, "read")).rejects.toBeInstanceOf(AccessError);
});

afterAll(async () => {
  await prisma.$disconnect();
});
