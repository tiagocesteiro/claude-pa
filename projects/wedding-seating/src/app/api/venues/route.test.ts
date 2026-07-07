import { describe, it, expect, afterAll } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/db/client";

it("POST creates a venue and GET lists it", async () => {
  const res = await POST(new Request("http://x/api/venues", {
    method: "POST",
    body: JSON.stringify({ name: "API Quinta", location: "Cascais" }),
  }));
  expect(res.status).toBe(201);
  const created = await res.json();
  expect(created.name).toBe("API Quinta");

  const list = await (await GET()).json();
  expect(list.some((v: { id: string }) => v.id === created.id)).toBe(true);
});

it("POST rejects a missing name", async () => {
  const res = await POST(new Request("http://x/api/venues", { method: "POST", body: "{}" }));
  expect(res.status).toBe(400);
});

it("POST returns 400 (not 500) on an empty body", async () => {
  const res = await POST(new Request("http://x/api/venues", { method: "POST", body: "" }));
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
