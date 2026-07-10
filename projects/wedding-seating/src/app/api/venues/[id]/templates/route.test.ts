import { describe, it, expect, afterAll } from "vitest";
import { GET, POST } from "./route";
import { PATCH, DELETE } from "@/app/api/templates/[id]/route";
import { prisma } from "@/lib/db/client";

it("POST creates a layout template; GET lists it", async () => {
  const v = await prisma.venue.create({ data: { name: "V API Tpl" } });
  const lines = JSON.stringify([{ tableTypeId: "tt1", quantity: 10 }]);
  const res = await POST(
    new Request("http://x/templates", { method: "POST", body: JSON.stringify({ name: "80-100", minGuests: 80, maxGuests: 100, lines }) }),
    { params: Promise.resolve({ id: v.id }) }
  );
  expect(res.status).toBe(201);
  const list = await (await GET(new Request("http://x/templates"), { params: Promise.resolve({ id: v.id }) })).json();
  expect(list.some((t: { name: string }) => t.name === "80-100")).toBe(true);
});

it("POST rejects missing name", async () => {
  const v = await prisma.venue.create({ data: { name: "V API Tpl2" } });
  const res = await POST(new Request("http://x/templates", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: v.id }) });
  expect(res.status).toBe(400);
});

it("POST rejects non-numeric guest range", async () => {
  const v = await prisma.venue.create({ data: { name: "V API Tpl3" } });
  const res = await POST(
    new Request("http://x/templates", { method: "POST", body: JSON.stringify({ name: "Bad", minGuests: "a", maxGuests: 100, lines: "[]" }) }),
    { params: Promise.resolve({ id: v.id }) }
  );
  expect(res.status).toBe(400);
});

it("PATCH whitelists editable fields; ignores venueId (mass-assignment guard)", async () => {
  const originalVenue = await prisma.venue.create({ data: { name: "V Tpl Original" } });
  const otherVenue = await prisma.venue.create({ data: { name: "V Tpl Other" } });
  const created = await prisma.layoutTemplate.create({
    data: { venueId: originalVenue.id, name: "60-80", minGuests: 60, maxGuests: 80, lines: "[]" },
  });

  const res = await PATCH(
    new Request("http://x/templates/" + created.id, {
      method: "PATCH",
      body: JSON.stringify({ maxGuests: 90, venueId: otherVenue.id }),
    }),
    { params: Promise.resolve({ id: created.id }) }
  );
  expect(res.status).toBe(200);

  const updated = await prisma.layoutTemplate.findUniqueOrThrow({ where: { id: created.id } });
  expect(updated.maxGuests).toBe(90);
  expect(updated.venueId).toBe(originalVenue.id);
});

it("DELETE removes the template", async () => {
  const v = await prisma.venue.create({ data: { name: "V Tpl Del" } });
  const created = await prisma.layoutTemplate.create({
    data: { venueId: v.id, name: "To Delete", minGuests: 10, maxGuests: 20, lines: "[]" },
  });
  const res = await DELETE(new Request("http://x/templates/" + created.id, { method: "DELETE" }), { params: Promise.resolve({ id: created.id }) });
  expect(res.status).toBe(200);
  const list = await prisma.layoutTemplate.findMany({ where: { venueId: v.id } });
  expect(list.length).toBe(0);
});

afterAll(async () => { await prisma.$disconnect(); });
