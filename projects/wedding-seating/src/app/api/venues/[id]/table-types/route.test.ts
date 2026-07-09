import { describe, it, expect, afterAll } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/db/client";

it("POST creates a table type; GET lists it", async () => {
  const v = await prisma.venue.create({ data: { name: "V API" } });
  const res = await POST(
    new Request("http://x/tt", { method: "POST", body: JSON.stringify({ name: "R8", shape: "round", minSeats: 6, maxSeats: 8, width: 1.5, depth: 1.5, quantity: 5 }) }),
    { params: Promise.resolve({ id: v.id }) }
  );
  expect(res.status).toBe(201);
  const list = await (await GET(new Request("http://x/tt"), { params: Promise.resolve({ id: v.id }) })).json();
  expect(list.some((t: { name: string }) => t.name === "R8")).toBe(true);
});

it("POST rejects missing name", async () => {
  const v = await prisma.venue.create({ data: { name: "V API2" } });
  const res = await POST(new Request("http://x/tt", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: v.id }) });
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
