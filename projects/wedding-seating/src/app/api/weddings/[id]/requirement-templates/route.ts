import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { listRequirementTemplates } from "@/lib/db/requirementTemplates";
import { createRequirement, type RequirementData, type RequirementKind } from "@/lib/db/requirements";
import { assertWeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent } from "@/lib/db/audit";

export const runtime = "nodejs";

const MANAGERS = ["venue", "admin"] as const;

/** Resolve the wedding's venue + the supplier slots (by service) once. */
async function resolveContext(weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: {
      venueId: true,
      suppliers: { select: { id: true, name: true, service: true } },
      services: { select: { id: true, kind: true } },
    },
  });
  if (!wedding) return null;
  const supplierByService = new Map<string, { id: string; name: string }>();
  for (const s of wedding.suppliers) {
    if (s.service && !supplierByService.has(s.service)) supplierByService.set(s.service, { id: s.id, name: s.name });
  }
  const serviceIdByKind = new Map(wedding.services.map((s) => [s.kind, s.id]));
  return { venueId: wedding.venueId, supplierByService, serviceIdByKind };
}

/** The venue's request templates, resolved against THIS wedding (which supplier
 * each would go to). Venue/admin only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, [...MANAGERS]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  const ctx = await resolveContext(id);
  if (!ctx?.venueId) return NextResponse.json({ templates: [] });

  const templates = await listRequirementTemplates(ctx.venueId);
  const resolved = templates.map((t) => {
    const supplier = t.service ? ctx.supplierByService.get(t.service) ?? null : null;
    return {
      id: t.id,
      kind: t.kind,
      service: t.service,
      title: t.title,
      detail: t.detail,
      data: t.data,
      targetLabel: t.service ? supplier?.name ?? "(sem fornecedor)" : "Noivos",
      hasTarget: t.service ? Boolean(supplier) : true,
    };
  });
  return NextResponse.json({ templates: resolved });
}

/** Apply (send) selected templates to this wedding — each becomes a
 * WeddingRequirement from the venue, addressed to the matching supplier (or the
 * couple). Body: { templateIds: string[] }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, [...MANAGERS]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  const ctx = await resolveContext(id);
  if (!ctx?.venueId) return NextResponse.json({ error: "casamento sem quinta" }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b?.templateIds) ? b.templateIds.filter((x: unknown) => typeof x === "string") : [];
  if (ids.length === 0) return NextResponse.json({ error: "templateIds required" }, { status: 400 });

  // Only templates that belong to THIS wedding's venue.
  const templates = (await listRequirementTemplates(ctx.venueId)).filter((t) => ids.includes(t.id));

  let created = 0;
  for (const t of templates) {
    const supplier = t.service ? ctx.supplierByService.get(t.service) ?? null : null;
    const serviceId = t.service ? ctx.serviceIdByKind.get(t.service) ?? null : null;
    const req = await createRequirement(id, {
      title: t.title,
      kind: (t.kind === "question" ? "question" : "request") as RequirementKind,
      fromRole: "venue",
      fromProfileId: actor.userId,
      toSupplierId: supplier?.id ?? null,
      toRole: t.service ? null : "couple",
      serviceId,
      detail: t.detail,
      data: (t.data as RequirementData | null) ?? null,
    });
    created++;
    await recordEvent({
      weddingId: id,
      actor,
      action: "requirement.created",
      entityType: "requirement",
      entityId: req.id,
      summary: `${t.kind === "question" ? "Enviou a dúvida" : "Enviou o pedido"} «${t.title}»${supplier ? ` a ${supplier.name}` : ""} (template)`,
      supplierId: supplier?.id ?? null,
    });
  }
  return NextResponse.json({ created });
}
