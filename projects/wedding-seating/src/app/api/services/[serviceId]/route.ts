import { NextResponse } from "next/server";
import { updateService, deleteService, type ProviderType } from "@/lib/db/services";
import { assertServiceAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

const PROVIDER_TYPES: ProviderType[] = ["venue", "supplier", "couple"];
const STATUSES = ["planned", "confirmed", "done"];

export async function PATCH(req: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { serviceId } = await params;
  try {
    await assertServiceAccess(actor, serviceId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const fields: Parameters<typeof updateService>[1] = {};
  if (typeof b?.kind === "string" && b.kind.trim()) fields.kind = b.kind.trim();
  if ("name" in b) fields.name = typeof b.name === "string" && b.name.trim() ? b.name.trim() : null;
  if (PROVIDER_TYPES.includes(b?.providerType)) fields.providerType = b.providerType;
  if ("supplierId" in b) fields.supplierId = typeof b.supplierId === "string" ? b.supplierId : null;
  if (STATUSES.includes(b?.status)) fields.status = b.status;
  if ("note" in b) fields.note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
  const service = await updateService(serviceId, fields);
  return NextResponse.json({ service });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { serviceId } = await params;
  try {
    await assertServiceAccess(actor, serviceId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteService(serviceId);
  return NextResponse.json({ ok: true });
}
