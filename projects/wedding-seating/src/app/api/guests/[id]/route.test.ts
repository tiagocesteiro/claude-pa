import { describe, it, expect, afterAll } from "vitest";
import { PATCH } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { createGuest } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

it("PATCH persists a valid rsvp value", async () => {
  const w = await createWedding({ couple: "Guest RSVP PATCH" });
  const g = await createGuest({ weddingId: w.id, name: "Rita" });

  const res = await PATCH(
    new Request("http://x/guests/" + g.id, { method: "PATCH", body: JSON.stringify({ rsvp: "confirmed" }) }),
    { params: Promise.resolve({ id: g.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.rsvp).toBe("confirmed");
});

it("PATCH 400s on an invalid rsvp value", async () => {
  const w = await createWedding({ couple: "Guest RSVP Bad" });
  const g = await createGuest({ weddingId: w.id, name: "Bogus" });

  const res = await PATCH(
    new Request("http://x/guests/" + g.id, { method: "PATCH", body: JSON.stringify({ rsvp: "bogus" }) }),
    { params: Promise.resolve({ id: g.id }) }
  );
  expect(res.status).toBe(400);

  const stillPending = await prisma.guest.findUnique({ where: { id: g.id } });
  expect(stillPending?.rsvp).toBe("pending");
});

afterAll(async () => { await prisma.$disconnect(); });
