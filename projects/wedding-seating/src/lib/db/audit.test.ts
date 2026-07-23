import { it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { recordEvent, listAuditEvents, diff, unseenCountsForProfile, type AuditActor } from "./audit";
import { addParticipant, markActivitySeen } from "./participants";
import { prisma } from "./client";

const venue: AuditActor = { userId: "au-venue", role: "venue", email: "v@t.pt" };
const supA: AuditActor = { userId: "au-supA", role: "supplier", email: null };

it("diff returns only changed fields", () => {
  expect(diff({ a: 1, b: 2, c: 3 }, { a: 1, b: 5 })).toEqual({ b: { from: 2, to: 5 } });
  expect(diff({ x: "open" }, { x: "open" })).toEqual({});
  expect(diff({ n: null as string | null }, { n: "x" })).toEqual({ n: { from: null, to: "x" } });
});

it("records events and scopes supplier visibility (authored OR own slot)", async () => {
  const w = await createWedding({ couple: "Audit Scope" });

  await recordEvent({ weddingId: w.id, actor: venue, action: "service.created", entityType: "service", summary: "Serviço A", supplierId: "slotA" });
  await recordEvent({ weddingId: w.id, actor: supA, action: "requirement.created", entityType: "requirement", summary: "Pedido do A" }); // authored by supA, no slot tag
  await recordEvent({ weddingId: w.id, actor: venue, action: "service.created", entityType: "service", summary: "Serviço B", supplierId: "slotB" });

  const all = await listAuditEvents(w.id, { kind: "all" });
  expect(all.length).toBe(3);

  // Supplier A: sees the slotA event + the one they authored — never slotB's.
  const aScope = await listAuditEvents(w.id, { kind: "supplier", supplierId: "slotA", profileId: "au-supA" });
  expect(aScope.map((e) => e.summary).sort()).toEqual(["Pedido do A", "Serviço A"]);

  // Supplier B: only the slotB event (authored nothing).
  const bScope = await listAuditEvents(w.id, { kind: "supplier", supplierId: "slotB", profileId: "au-supB" });
  expect(bScope.map((e) => e.summary)).toEqual(["Serviço B"]);

  // Diffs round-trip through JSON.
  await recordEvent({
    weddingId: w.id, actor: venue, action: "requirement.status_changed", entityType: "requirement",
    summary: "Mudou estado", changes: { status: { from: "open", to: "agreed" } },
  });
  const latest = (await listAuditEvents(w.id, { kind: "all" }))[0];
  expect(latest.changes).toEqual({ status: { from: "open", to: "agreed" } });
});

it("recordEvent never throws (bad weddingId is swallowed, not propagated)", async () => {
  await expect(
    recordEvent({ weddingId: "does-not-exist", actor: venue, action: "x", entityType: "y", summary: "z" })
  ).resolves.toBeUndefined();
  // and nothing was written under that id
  expect(await prisma.auditEvent.count({ where: { weddingId: "does-not-exist" } })).toBe(0);
});

it("unseen counts: exclude own actions, respect lastSeen + supplier scope", async () => {
  const w = await createWedding({ couple: "Unseen" });
  await addParticipant(w.id, "u-couple", "couple");
  await addParticipant(w.id, "u-sup", "supplier", "slotU");

  const venueA: AuditActor = { userId: "u-venue", role: "venue", email: null };
  const coupleA: AuditActor = { userId: "u-couple", role: "couple", email: null };

  await recordEvent({ weddingId: w.id, actor: venueA, action: "x", entityType: "y", summary: "geral" });
  await recordEvent({ weddingId: w.id, actor: venueA, action: "x", entityType: "y", summary: "p/ fornecedor", supplierId: "slotU" });
  await recordEvent({ weddingId: w.id, actor: coupleA, action: "x", entityType: "y", summary: "do casal" });

  // Couple: everything not authored by them → 2 venue events.
  expect((await unseenCountsForProfile("u-couple"))[w.id]).toBe(2);
  // Supplier: only events tagged their slot → 1.
  expect((await unseenCountsForProfile("u-sup"))[w.id]).toBe(1);

  // Marking seen clears the couple's badge…
  await markActivitySeen(w.id, "u-couple");
  expect((await unseenCountsForProfile("u-couple"))[w.id]).toBeUndefined();

  // …and a later event counts again.
  await recordEvent({ weddingId: w.id, actor: venueA, action: "x", entityType: "y", summary: "novo" });
  expect((await unseenCountsForProfile("u-couple"))[w.id]).toBe(1);
});

afterAll(async () => {
  await prisma.$disconnect();
});
