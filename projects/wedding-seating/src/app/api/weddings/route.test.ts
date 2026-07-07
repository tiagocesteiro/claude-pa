import { describe, it, expect, afterAll } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/db/client";

it("POST creates a wedding, GET lists it", async () => {
  const res = await POST(new Request("http://x/api/weddings", {
    method: "POST",
    body: JSON.stringify({ couple: "Ana & Bruno" }),
  }));
  expect(res.status).toBe(201);
  const created = await res.json();
  expect(created.couple).toBe("Ana & Bruno");
  const list = await (await GET()).json();
  expect(list.some((w: { id: string }) => w.id === created.id)).toBe(true);
});

it("POST rejects missing couple", async () => {
  const res = await POST(new Request("http://x/api/weddings", { method: "POST", body: "{}" }));
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
