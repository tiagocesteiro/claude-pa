import { it, expect, afterAll } from "vitest";
import {
  createRequirementTemplate,
  listRequirementTemplates,
  updateRequirementTemplate,
  deleteRequirementTemplate,
  getRequirementTemplate,
} from "./requirementTemplates";
import { assertRequirementTemplateAccess, AccessError } from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

it("requirement-template CRUD (venue-owned)", async () => {
  const venue = await prisma.venue.create({ data: { name: "T Venue", ownerId: "t-owner" } });
  const t = await createRequirementTemplate(venue.id, {
    kind: "request", service: "catering", title: "Confirmar nº de mesas", data: { tables: 8 },
  });
  expect(t.kind).toBe("request");
  expect(t.service).toBe("catering");
  expect(t.data).toEqual({ tables: 8 });

  const q = await createRequirementTemplate(venue.id, { kind: "question", service: null, title: "Fornece toalhas?" });
  expect(q.kind).toBe("question");
  expect(q.service).toBeNull(); // null service → targets the couple

  expect((await listRequirementTemplates(venue.id)).length).toBe(2);

  await updateRequirementTemplate(t.id, { title: "Mesas + metros" });
  expect((await getRequirementTemplate(t.id))?.title).toBe("Mesas + metros");

  await deleteRequirementTemplate(q.id);
  expect(await getRequirementTemplate(q.id)).toBeNull();
});

it("assertRequirementTemplateAccess: only the owning venue may write", async () => {
  const venue = await prisma.venue.create({ data: { name: "Own Venue", ownerId: "own-a" } });
  const t = await createRequirementTemplate(venue.id, { title: "X", service: "dj" });

  const owner: Actor = { userId: "own-a", email: "", role: "venue" };
  const stranger: Actor = { userId: "own-b", email: "", role: "venue" };

  await expect(assertRequirementTemplateAccess(owner, t.id, "write")).resolves.toBeUndefined();
  await expect(assertRequirementTemplateAccess(stranger, t.id, "write")).rejects.toBeInstanceOf(AccessError);
  await expect(assertRequirementTemplateAccess(owner, "nope", "read")).rejects.toBeInstanceOf(AccessError);
});

afterAll(async () => {
  await prisma.$disconnect();
});
