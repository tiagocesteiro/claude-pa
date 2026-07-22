import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { updateSupplier, deleteSupplier } from "@/lib/db/suppliers";
import { assertWeddingRole, AccessError } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import type { Actor } from "@/lib/auth/actor";

export const runtime = "nodejs";

// The venue (owner) or couple may manage a supplier slot.
async function assertManage(actor: Actor, supplierId: string) {
  const s = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { weddingId: true } });
  if (!s) throw new AccessError(404, "Fornecedor não encontrado.");
  await assertWeddingRole(actor, s.weddingId, ["venue", "couple", "admin"]);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ supplierId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { supplierId } = await params;
  try {
    await assertManage(actor, supplierId);
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const fields: { name?: string; service?: string | null; contact?: string | null } = {};
  if (typeof b?.name === "string" && b.name.trim()) fields.name = b.name.trim();
  if ("service" in b) fields.service = b.service ? String(b.service) : null;
  if ("contact" in b) fields.contact = b.contact ? String(b.contact) : null;
  return NextResponse.json({ supplier: await updateSupplier(supplierId, fields) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ supplierId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { supplierId } = await params;
  try {
    await assertManage(actor, supplierId);
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteSupplier(supplierId);
  return NextResponse.json({ ok: true });
}
