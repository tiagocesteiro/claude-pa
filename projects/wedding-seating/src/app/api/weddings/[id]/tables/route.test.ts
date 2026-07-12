import { describe, it, expect, afterAll } from "vitest";
import { GET, PUT } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { prisma } from "@/lib/db/client";

it("PUT round-trips the wedding's tables via GET", async () => {
  const w = await createWedding({ couple: "Tables Route" });

  const putRes = await PUT(
    new Request("http://x/tables", {
      method: "PUT",
      body: JSON.stringify({
        tables: [
          { shape: "round", capacity: 8, x: 10, y: 10, fixed: false },
          { shape: "rect", capacity: 10, x: 50, y: 50, fixed: false, width: 2, depth: 1 },
        ],
      }),
    }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(putRes.status).toBe(200);

  const getRes = await GET(new Request("http://x/tables"), { params: Promise.resolve({ id: w.id }) });
  expect(getRes.status).toBe(200);
  const tables = await getRes.json();
  expect(tables.length).toBe(2);
  expect(tables.every((t: { weddingId: string }) => t.weddingId === w.id)).toBe(true);
});

it("moving/removing via PUT preserves kept ids and unassigns only the removed table's guests", async () => {
  const w = await createWedding({ couple: "Tables Route Edit" });
  const t1 = await prisma.table.create({
    data: { weddingId: w.id, shape: "round", capacity: 8, x: 1, y: 1, fixed: false },
  });
  const t2 = await prisma.table.create({
    data: { weddingId: w.id, shape: "round", capacity: 8, x: 2, y: 2, fixed: false },
  });
  const guestKept = await prisma.guest.create({
    data: { weddingId: w.id, name: "K", assignedTableId: t1.id },
  });
  const guestRemoved = await prisma.guest.create({
    data: { weddingId: w.id, name: "R", assignedTableId: t2.id },
  });

  // move t1, drop t2 from the set (remove)
  const res = await PUT(
    new Request("http://x/tables", {
      method: "PUT",
      body: JSON.stringify({
        tables: [{ id: t1.id, shape: "round", capacity: 8, x: 777, y: 777, fixed: false }],
      }),
    }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(200);

  const remaining = await prisma.table.findMany({ where: { weddingId: w.id } });
  expect(remaining.length).toBe(1);
  expect(remaining[0].id).toBe(t1.id);
  expect(remaining[0].x).toBe(777);

  const gk = await prisma.guest.findUnique({ where: { id: guestKept.id } });
  expect(gk?.assignedTableId).toBe(t1.id);
  const gr = await prisma.guest.findUnique({ where: { id: guestRemoved.id } });
  expect(gr?.assignedTableId).toBeNull();
});

it("400s when tables is not an array", async () => {
  const w = await createWedding({ couple: "Tables Route 400" });
  const res = await PUT(new Request("http://x/tables", { method: "PUT", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(400);
});

afterAll(async () => {
  await prisma.$disconnect();
});
