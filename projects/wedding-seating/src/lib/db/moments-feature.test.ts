import { it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { listMoments, createMoment, updateMoment, deleteMoment, MOMENT_KINDS } from "./moments";
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from "./suppliers";
import { listMomentTasks, createTask, updateTask, deleteTask } from "./tasks";
import { listMomentDecor, addDecorFromCatalog, addCustomDecor, deleteMomentDecor } from "./momentDecor";
import { listDecorItems, createDecorItem, updateDecorItem, deleteDecorItem } from "./decorCatalog";
import {
  AccessError,
  assertMomentAccess,
  assertSupplierAccess,
  assertTaskAccess,
  assertDecorItemAccess,
} from "@/lib/auth/access";
import type { Actor } from "@/lib/auth/actor";
import { prisma } from "./client";

it("createWedding seeds the 4 default moments with titles + order", async () => {
  const w = await createWedding({ couple: "Seed Moments" });
  const moments = await listMoments(w.id);
  expect(moments.map((m) => m.kind)).toEqual([...MOMENT_KINDS]);
  expect(moments.map((m) => m.title)).toEqual(["Cerimónia", "Cocktail", "Jantar", "Dança"]);
  expect(moments.map((m) => m.order)).toEqual([0, 1, 2, 3]);
});

it("moments: startTime + hasSeating persist; dinner seeds hasSeating=true", async () => {
  const w = await createWedding({ couple: "Timings" });
  const moments = await listMoments(w.id);
  const dinner = moments.find((m) => m.kind === "dinner")!;
  const ceremony = moments.find((m) => m.kind === "ceremony")!;
  expect(dinner.hasSeating).toBe(true);
  expect(ceremony.hasSeating).toBe(false);

  await updateMoment(ceremony.id, { startTime: "16:00", hasSeating: true });
  const after = (await listMoments(w.id)).find((m) => m.id === ceremony.id)!;
  expect(after.startTime).toBe("16:00");
  expect(after.hasSeating).toBe(true);
});

it("moments: add a custom one at the end, rename, reorder, delete", async () => {
  const w = await createWedding({ couple: "Custom Moments" });
  const custom = await createMoment(w.id, "Photobooth");
  expect(custom.kind).toBeNull();
  expect(custom.order).toBe(4); // after the 4 seeds (0..3)

  await updateMoment(custom.id, { title: "Photo Corner", order: 0 });
  const renamed = (await listMoments(w.id)).find((m) => m.id === custom.id)!;
  expect(renamed.title).toBe("Photo Corner");

  await deleteMoment(custom.id);
  expect((await listMoments(w.id)).some((m) => m.id === custom.id)).toBe(false);
});

it("suppliers CRUD", async () => {
  const w = await createWedding({ couple: "Suppliers" });
  const s = await createSupplier(w.id, { name: "DJ Sound", service: "Música", contact: "911" });
  expect((await listSuppliers(w.id)).length).toBe(1);
  await updateSupplier(s.id, { contact: "912" });
  expect((await listSuppliers(w.id))[0].contact).toBe("912");
  await deleteSupplier(s.id);
  expect((await listSuppliers(w.id)).length).toBe(0);
});

it("tasks: create with a supplier assignee; changing assignee clears the supplier", async () => {
  const w = await createWedding({ couple: "Tasks" });
  const moment = (await listMoments(w.id))[0];
  const supplier = await createSupplier(w.id, { name: "Florista" });

  const t = await createTask(moment.id, { text: "Encomendar flores", assignee: "supplier", supplierId: supplier.id });
  expect(t.assignee).toBe("supplier");
  expect(t.supplierId).toBe(supplier.id);

  await updateTask(t.id, { done: true });
  expect((await listMomentTasks(moment.id))[0].done).toBe(true);

  // Reassigning to the couple must clear the supplier link.
  await updateTask(t.id, { assignee: "couple" });
  const after = (await listMomentTasks(moment.id))[0];
  expect(after.assignee).toBe("couple");
  expect(after.supplierId).toBeNull();

  await deleteTask(t.id);
  expect((await listMomentTasks(moment.id)).length).toBe(0);
});

it("deleting a supplier detaches its tasks (SetNull), keeping the tasks", async () => {
  const w = await createWedding({ couple: "Supplier Delete" });
  const moment = (await listMoments(w.id))[0];
  const supplier = await createSupplier(w.id, { name: "Catering" });
  const t = await createTask(moment.id, { text: "Menu", assignee: "supplier", supplierId: supplier.id });

  await deleteSupplier(supplier.id);
  const after = (await listMomentTasks(moment.id)).find((x) => x.id === t.id)!;
  expect(after).toBeDefined(); // task survives
  expect(after.supplierId).toBeNull(); // link cleared
});

it("moment decor: from the venue catalog + a custom line; delete", async () => {
  const w = await createWedding({ couple: "Decor" });
  const moment = (await listMoments(w.id))[0];
  const venue = await prisma.venue.create({ data: { name: "Decor Venue" } });
  const item = await createDecorItem(venue.id, { name: "Arco floral", category: "Flores", price: 120 });

  const fromCatalog = await addDecorFromCatalog(moment.id, item.id, 2);
  const custom = await addCustomDecor(moment.id, { name: "Velas próprias", quantity: 10 });

  const decor = await listMomentDecor(moment.id);
  expect(decor.length).toBe(2);
  const cat = decor.find((d) => d.id === fromCatalog.id)!;
  expect(cat.decorItem?.name).toBe("Arco floral");
  expect(cat.quantity).toBe(2);
  const cus = decor.find((d) => d.id === custom.id)!;
  expect(cus.decorItem).toBeNull();
  expect(cus.name).toBe("Velas próprias");

  await deleteMomentDecor(custom.id);
  expect((await listMomentDecor(moment.id)).length).toBe(1);
});

it("deleting a catalog item detaches referencing moment-decor lines (SetNull)", async () => {
  const w = await createWedding({ couple: "Catalog Delete" });
  const moment = (await listMoments(w.id))[0];
  const venue = await prisma.venue.create({ data: { name: "Cat Del Venue" } });
  const item = await createDecorItem(venue.id, { name: "Tapete" });
  const line = await addDecorFromCatalog(moment.id, item.id, 1);

  await deleteDecorItem(item.id);
  const after = (await listMomentDecor(moment.id)).find((d) => d.id === line.id)!;
  expect(after).toBeDefined(); // line survives
  expect(after.decorItemId).toBeNull(); // reference cleared
});

it("decor catalog CRUD (venue-owned)", async () => {
  const venue = await prisma.venue.create({ data: { name: "Catalog Venue" } });
  const a = await createDecorItem(venue.id, { name: "Centro de mesa", price: 25 });
  await createDecorItem(venue.id, { name: "Passadeira" });
  expect((await listDecorItems(venue.id)).length).toBe(2);
  await updateDecorItem(a.id, { price: 30 });
  expect((await listDecorItems(venue.id)).find((i) => i.id === a.id)!.price).toBe(30);
  await deleteDecorItem(a.id);
  expect((await listDecorItems(venue.id)).length).toBe(1);
});

it("deleting a moment cascades its tasks + decor", async () => {
  const w = await createWedding({ couple: "Moment Cascade" });
  const moment = (await listMoments(w.id))[0];
  const venue = await prisma.venue.create({ data: { name: "Casc Venue" } });
  const item = await createDecorItem(venue.id, { name: "X" });
  const task = await createTask(moment.id, { text: "t" });
  const decor = await addDecorFromCatalog(moment.id, item.id, 1);

  await deleteMoment(moment.id);
  expect(await prisma.momentTask.findUnique({ where: { id: task.id } })).toBeNull();
  expect(await prisma.momentDecor.findUnique({ where: { id: decor.id } })).toBeNull();
});

it("tenancy: another couple / venue cannot reach a wedding's moments/tasks/suppliers", async () => {
  const CA: Actor = { userId: "mf-couple-A", email: "a@test.pt", role: "couple" };
  const CB: Actor = { userId: "mf-couple-B", email: "b@test.pt", role: "couple" };
  const VB: Actor = { userId: "mf-venue-B", email: "vb@test.pt", role: "venue" };

  const w = await createWedding({ couple: "Owned by A" });
  await prisma.wedding.update({ where: { id: w.id }, data: { ownerId: CA.userId } });
  const moment = (await listMoments(w.id))[0];
  const supplier = await createSupplier(w.id, { name: "A's supplier" });
  const task = await createTask(moment.id, { text: "A's task" });

  // Owner A: allowed.
  await expect(assertMomentAccess(CA, moment.id, "write")).resolves.toBeUndefined();
  await expect(assertSupplierAccess(CA, supplier.id, "write")).resolves.toBeUndefined();
  await expect(assertTaskAccess(CA, task.id, "write")).resolves.toBeUndefined();

  // Another couple B: denied (404 — hidden).
  await expect(assertMomentAccess(CB, moment.id, "read")).rejects.toBeInstanceOf(AccessError);
  await expect(assertSupplierAccess(CB, supplier.id, "read")).rejects.toBeInstanceOf(AccessError);
  await expect(assertTaskAccess(CB, task.id, "read")).rejects.toBeInstanceOf(AccessError);

  // A venue: denied on wedding-owned data (403).
  await expect(assertMomentAccess(VB, moment.id, "read")).rejects.toBeInstanceOf(AccessError);

  // A venue may NOT write another venue's decor catalog item.
  const venueB = await prisma.venue.create({ data: { name: "V B", ownerId: VB.userId } });
  const item = await createDecorItem(venueB.id, { name: "B item" });
  await expect(assertDecorItemAccess(VB, item.id, "write")).resolves.toBeUndefined();
  const VC: Actor = { userId: "mf-venue-C", email: "vc@test.pt", role: "venue" };
  await expect(assertDecorItemAccess(VC, item.id, "write")).rejects.toBeInstanceOf(AccessError);
});

afterAll(async () => {
  await prisma.$disconnect();
});
