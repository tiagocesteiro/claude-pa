import { NextResponse } from "next/server";
import { getService, updateService, deleteService, type ProviderType } from "@/lib/db/services";
import { assertServiceAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent, diff } from "@/lib/db/audit";
import { SERVICE_KIND_LABELS, PROVIDER_LABELS, SERVICE_STATUS_LABELS } from "@/lib/labels";

export const runtime = "nodejs";

const PROVIDER_TYPES: ProviderType[] = ["venue", "supplier", "couple"];
const STATUSES = ["planned", "confirmed", "done"];

export async function PATCH(req: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { serviceId } = await params;
  let weddingId: string;
  try {
    weddingId = await assertServiceAccess(actor, serviceId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const before = await getService(serviceId);
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const fields: Parameters<typeof updateService>[1] = {};
  if (typeof b?.kind === "string" && b.kind.trim()) fields.kind = b.kind.trim();
  if ("name" in b) fields.name = typeof b.name === "string" && b.name.trim() ? b.name.trim() : null;
  if (PROVIDER_TYPES.includes(b?.providerType)) fields.providerType = b.providerType;
  if ("supplierId" in b) fields.supplierId = typeof b.supplierId === "string" ? b.supplierId : null;
  if (STATUSES.includes(b?.status)) fields.status = b.status;
  if ("note" in b) fields.note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
  const service = await updateService(serviceId, fields);

  const changes = diff(
    { providerType: before.providerType, supplierId: before.supplierId, status: before.status, name: before.name },
    { providerType: service.providerType, supplierId: service.supplierId, status: service.status, name: service.name }
  );
  if (Object.keys(changes).length > 0) {
    const kindLabel = SERVICE_KIND_LABELS[service.kind] ?? service.kind;
    let summary: string;
    if (changes.providerType || changes.supplierId) {
      summary = `Atribuiu ${kindLabel} a ${PROVIDER_LABELS[service.providerType] ?? service.providerType}`;
    } else if (changes.status) {
      summary = `Marcou ${kindLabel} como ${SERVICE_STATUS_LABELS[service.status] ?? service.status}`;
    } else {
      summary = `Editou o serviço ${kindLabel}`;
    }
    await recordEvent({
      weddingId,
      actor,
      action: changes.status && !changes.providerType && !changes.supplierId ? "service.status_changed" : "service.updated",
      entityType: "service",
      entityId: service.id,
      summary,
      supplierId: service.supplierId ?? before.supplierId,
      changes,
    });
  }
  return NextResponse.json({ service });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { serviceId } = await params;
  let weddingId: string;
  try {
    weddingId = await assertServiceAccess(actor, serviceId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const before = await getService(serviceId);
  await deleteService(serviceId);
  if (before) {
    await recordEvent({
      weddingId,
      actor,
      action: "service.deleted",
      entityType: "service",
      entityId: serviceId,
      summary: `Removeu o serviço ${SERVICE_KIND_LABELS[before.kind] ?? before.kind}`,
      supplierId: before.supplierId,
    });
  }
  return NextResponse.json({ ok: true });
}
