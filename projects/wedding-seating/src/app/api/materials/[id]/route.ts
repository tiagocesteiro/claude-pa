import { NextResponse } from "next/server";
import { updateMaterial, deleteMaterial } from "@/lib/db/materials";
import { assertMaterialAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent } from "@/lib/db/audit";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertMaterialAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const fields: { name?: string; quantity?: number; note?: string | null } = {};
  if (typeof b?.name === "string" && b.name.trim()) fields.name = b.name.trim();
  if (Number.isFinite(Number(b?.quantity))) fields.quantity = Number(b.quantity);
  if ("note" in b) fields.note = b.note ? String(b.note) : null;
  return NextResponse.json({ material: await updateMaterial(id, fields) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertMaterialAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const before = await prisma.momentMaterial.findUnique({
    where: { id },
    select: { name: true, moment: { select: { weddingId: true } } },
  });
  await deleteMaterial(id);
  if (before) {
    await recordEvent({
      weddingId: before.moment.weddingId,
      actor,
      action: "material.removed",
      entityType: "material",
      entityId: id,
      summary: `Removeu material «${before.name}»`,
    });
  }
  return NextResponse.json({ ok: true });
}
