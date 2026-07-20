import { describe, it, expect, afterAll, vi } from "vitest";
import ExcelJS from "exceljs";

// Fase D2b: route now requires an actor + tenancy check; mock an admin actor so
// these logic tests bypass ownership (existence still enforced).
vi.mock("@/lib/auth/actor", () => ({
  getActor: async () => ({ userId: "test-admin", email: "admin@test.dev", role: "admin" }),
}));

import { POST } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { listGuests } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

it("imports guests from an uploaded xlsx", async () => {
  const w = await createWedding({ couple: "Upload Import" });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("g");
  ws.addRow(["nome", "grupo"]);
  ws.addRow(["Ana", "Família"]);
  ws.addRow(["Bruno", "Família"]);
  const buf = (await wb.xlsx.writeBuffer()) as unknown as Buffer;

  const form = new FormData();
  form.set("file", new File([new Uint8Array(buf)], "guests.xlsx"));

  const res = await POST(new Request("http://x/import", { method: "POST", body: form }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual({ guests: 2, groups: 1 });
  expect((await listGuests(w.id)).length).toBe(2);
});

afterAll(async () => { await prisma.$disconnect(); });
