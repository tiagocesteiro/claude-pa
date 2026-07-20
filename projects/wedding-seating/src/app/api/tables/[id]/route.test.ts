import { it, expect, afterAll, vi } from "vitest";

// Fase D2b: route now requires an actor + tenancy check; mock an admin actor so
// these logic tests bypass ownership (existence still enforced).
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-admin", email: "admin@test.dev", role: "admin" }),
}));

import { PATCH } from "./route";
import { prisma } from "@/lib/db/client";

async function makeWeddingTable() {
  const w = await prisma.wedding.create({ data: { couple: "Table PATCH" } });
  return prisma.table.create({
    data: { weddingId: w.id, shape: "round", capacity: 8, x: 10, y: 10, fixed: false },
  });
}

it("PATCH persists a new name", async () => {
  const t = await makeWeddingTable();
  const res = await PATCH(
    new Request("http://x/tables/" + t.id, { method: "PATCH", body: JSON.stringify({ name: "Mesa dos noivos" }) }),
    { params: Promise.resolve({ id: t.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.name).toBe("Mesa dos noivos");
});

it("PATCH clears a name back to null", async () => {
  const t = await makeWeddingTable();
  await PATCH(
    new Request("http://x/tables/" + t.id, { method: "PATCH", body: JSON.stringify({ name: "Temp" }) }),
    { params: Promise.resolve({ id: t.id }) }
  );
  const res = await PATCH(
    new Request("http://x/tables/" + t.id, { method: "PATCH", body: JSON.stringify({ name: null }) }),
    { params: Promise.resolve({ id: t.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.name).toBeNull();
});

it("PATCH still supports the existing fixed toggle", async () => {
  const t = await makeWeddingTable();
  const res = await PATCH(
    new Request("http://x/tables/" + t.id, { method: "PATCH", body: JSON.stringify({ fixed: true }) }),
    { params: Promise.resolve({ id: t.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.fixed).toBe(true);
});

it("PATCH accepts fixed and name together", async () => {
  const t = await makeWeddingTable();
  const res = await PATCH(
    new Request("http://x/tables/" + t.id, {
      method: "PATCH",
      body: JSON.stringify({ fixed: true, name: "Mesa 1" }),
    }),
    { params: Promise.resolve({ id: t.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.fixed).toBe(true);
  expect(body.name).toBe("Mesa 1");
});

it("PATCH 400s when neither fixed nor name is present", async () => {
  const t = await makeWeddingTable();
  const res = await PATCH(
    new Request("http://x/tables/" + t.id, { method: "PATCH", body: JSON.stringify({}) }),
    { params: Promise.resolve({ id: t.id }) }
  );
  expect(res.status).toBe(400);
});

it("PATCH 400s on an invalid fixed value", async () => {
  const t = await makeWeddingTable();
  const res = await PATCH(
    new Request("http://x/tables/" + t.id, { method: "PATCH", body: JSON.stringify({ fixed: "yes" }) }),
    { params: Promise.resolve({ id: t.id }) }
  );
  expect(res.status).toBe(400);
});

it("PATCH 400s on an invalid name value", async () => {
  const t = await makeWeddingTable();
  const res = await PATCH(
    new Request("http://x/tables/" + t.id, { method: "PATCH", body: JSON.stringify({ name: 42 }) }),
    { params: Promise.resolve({ id: t.id }) }
  );
  expect(res.status).toBe(400);
});

afterAll(async () => {
  await prisma.$disconnect();
});
