import { it, expect, afterAll } from "vitest";
import { PUT } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { createGuest } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

it("PUT pairs two guests symmetrically", async () => {
  const w = await createWedding({ couple: "Guest PlusOne PUT" });
  const a = await createGuest({ weddingId: w.id, name: "Ana" });
  const b = await createGuest({ weddingId: w.id, name: "Bruno" });

  const res = await PUT(
    new Request("http://x/guests/" + a.id + "/plus-one", {
      method: "PUT",
      body: JSON.stringify({ partnerId: b.id }),
    }),
    { params: Promise.resolve({ id: a.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.plusOneId).toBe(b.id);

  const bAfter = await prisma.guest.findUnique({ where: { id: b.id } });
  expect(bAfter?.plusOneId).toBe(a.id);
});

it("PUT with partnerId null clears both sides", async () => {
  const w = await createWedding({ couple: "Guest PlusOne Clear" });
  const a = await createGuest({ weddingId: w.id, name: "Carla" });
  const b = await createGuest({ weddingId: w.id, name: "Diogo" });

  await PUT(
    new Request("http://x/guests/" + a.id + "/plus-one", {
      method: "PUT",
      body: JSON.stringify({ partnerId: b.id }),
    }),
    { params: Promise.resolve({ id: a.id }) }
  );

  const res = await PUT(
    new Request("http://x/guests/" + a.id + "/plus-one", {
      method: "PUT",
      body: JSON.stringify({ partnerId: null }),
    }),
    { params: Promise.resolve({ id: a.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.plusOneId).toBeNull();

  const bAfter = await prisma.guest.findUnique({ where: { id: b.id } });
  expect(bAfter?.plusOneId).toBeNull();
});

it("PUT 400s when partnerId equals the guest's own id", async () => {
  const w = await createWedding({ couple: "Guest PlusOne Self" });
  const a = await createGuest({ weddingId: w.id, name: "Self Guest" });

  const res = await PUT(
    new Request("http://x/guests/" + a.id + "/plus-one", {
      method: "PUT",
      body: JSON.stringify({ partnerId: a.id }),
    }),
    { params: Promise.resolve({ id: a.id }) }
  );
  expect(res.status).toBe(400);
});

it("PUT 400s when partnerId is from a different wedding", async () => {
  const w1 = await createWedding({ couple: "Guest PlusOne Cross W1" });
  const w2 = await createWedding({ couple: "Guest PlusOne Cross W2" });
  const a = await createGuest({ weddingId: w1.id, name: "Eva" });
  const other = await createGuest({ weddingId: w2.id, name: "Foreign Guest" });

  const res = await PUT(
    new Request("http://x/guests/" + a.id + "/plus-one", {
      method: "PUT",
      body: JSON.stringify({ partnerId: other.id }),
    }),
    { params: Promise.resolve({ id: a.id }) }
  );
  expect(res.status).toBe(400);
});

it("PUT 400s when partnerId does not exist", async () => {
  const w = await createWedding({ couple: "Guest PlusOne Missing" });
  const a = await createGuest({ weddingId: w.id, name: "Missing Partner" });

  const res = await PUT(
    new Request("http://x/guests/" + a.id + "/plus-one", {
      method: "PUT",
      body: JSON.stringify({ partnerId: "does-not-exist" }),
    }),
    { params: Promise.resolve({ id: a.id }) }
  );
  expect(res.status).toBe(400);
});

it("PUT 404s when the guest does not exist", async () => {
  const res = await PUT(
    new Request("http://x/guests/does-not-exist/plus-one", {
      method: "PUT",
      body: JSON.stringify({ partnerId: null }),
    }),
    { params: Promise.resolve({ id: "does-not-exist" }) }
  );
  expect(res.status).toBe(404);
});

afterAll(async () => { await prisma.$disconnect(); });
