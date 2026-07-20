import { NextResponse } from "next/server";
import { updateSupplier, deleteSupplier } from "@/lib/db/suppliers";
import { assertSupplierAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ supplierId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { supplierId } = await params;
  try {
    await assertSupplierAccess(actor, supplierId, "write");
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
    await assertSupplierAccess(actor, supplierId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteSupplier(supplierId);
  return NextResponse.json({ ok: true });
}
