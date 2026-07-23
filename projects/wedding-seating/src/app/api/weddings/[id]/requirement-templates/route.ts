import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { listRequirementTemplates, listSupplierTemplates } from "@/lib/db/requirementTemplates";
import { createRequirement, type RequirementData, type RequirementKind } from "@/lib/db/requirements";
import { getWeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { AccessError } from "@/lib/auth/access";
import { recordEvent } from "@/lib/db/audit";
import type { RequirementTemplate } from "@prisma/client";

export const runtime = "nodejs";

interface ResolvedTemplate {
  id: string;
  kind: string;
  service: string | null;
  title: string;
  detail: string | null;
  data: unknown;
  targetLabel: string;
  hasTarget: boolean;
}

/** Resolve the wedding's venue + supplier slots (by service) once. */
async function weddingContext(weddingId: string) {
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

const ROLE_LABEL: Record<string, string> = { venue: "Quinta", couple: "Noivos" };

/** The applicable request templates for THIS wedding, per the actor's role:
 *   • venue/admin → the venue's templates, resolved to the matching supplier.
 *   • supplier    → the supplier's own templates, addressed to the venue/couple. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    const wr = await getWeddingRole(actor, id);
    if (!wr) throw new AccessError(404, "Wedding not found.");

    if (wr.role === "supplier") {
      const templates = await listSupplierTemplates(actor.userId);
      const resolved: ResolvedTemplate[] = templates.map((t) => ({
        id: t.id, kind: t.kind, service: null, title: t.title, detail: t.detail, data: t.data,
        targetLabel: ROLE_LABEL[t.targetRole ?? "venue"] ?? "Quinta", hasTarget: true,
      }));
      return NextResponse.json({ templates: resolved });
    }

    if (wr.role !== "venue" && wr.role !== "admin") throw new AccessError(403, "Sem permissão.");
    const ctx = await weddingContext(id);
    if (!ctx?.venueId) return NextResponse.json({ templates: [] });
    const templates = await listRequirementTemplates(ctx.venueId);
    const resolved: ResolvedTemplate[] = templates.map((t) => {
      const supplier = t.service ? ctx.supplierByService.get(t.service) ?? null : null;
      return {
        id: t.id, kind: t.kind, service: t.service, title: t.title, detail: t.detail, data: t.data,
        targetLabel: t.service ? supplier?.name ?? "(sem fornecedor)" : "Noivos",
        hasTarget: t.service ? Boolean(supplier) : true,
      };
    });
    return NextResponse.json({ templates: resolved });
  } catch (e) {
    return accessErrorResponse(e);
  }
}

/** Apply (send) selected templates → each becomes a WeddingRequirement.
 * Body: { templateIds: string[] }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    const wr = await getWeddingRole(actor, id);
    if (!wr) throw new AccessError(404, "Wedding not found.");

    const b = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(b?.templateIds) ? b.templateIds.filter((x: unknown) => typeof x === "string") : [];
    if (ids.length === 0) return NextResponse.json({ error: "templateIds required" }, { status: 400 });

    // ── Supplier: send their own templates to the venue/couple ──────────────
    if (wr.role === "supplier") {
      const mine = (await listSupplierTemplates(actor.userId)).filter((t) => ids.includes(t.id));
      let created = 0;
      for (const t of mine) {
        const toRole = t.targetRole === "couple" ? "couple" : "venue";
        const req = await createRequirement(id, {
          title: t.title,
          kind: (t.kind === "question" ? "question" : "request") as RequirementKind,
          fromRole: "supplier",
          fromProfileId: actor.userId,
          toRole,
          detail: t.detail,
          data: (t.data as RequirementData | null) ?? null,
        });
        created++;
        await recordEvent({
          weddingId: id, actor,
          action: "requirement.created", entityType: "requirement", entityId: req.id,
          summary: `${t.kind === "question" ? "Enviou a dúvida" : "Enviou o pedido"} «${t.title}» a ${ROLE_LABEL[toRole]} (template)`,
          supplierId: wr.supplierId ?? null,
        });
      }
      return NextResponse.json({ created });
    }

    // ── Venue/admin: send venue templates to the matching suppliers ─────────
    if (wr.role !== "venue" && wr.role !== "admin") throw new AccessError(403, "Sem permissão.");
    const ctx = await weddingContext(id);
    if (!ctx?.venueId) return NextResponse.json({ error: "casamento sem quinta" }, { status: 400 });
    const templates = (await listRequirementTemplates(ctx.venueId)).filter((t: RequirementTemplate) => ids.includes(t.id));

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
        weddingId: id, actor,
        action: "requirement.created", entityType: "requirement", entityId: req.id,
        summary: `${t.kind === "question" ? "Enviou a dúvida" : "Enviou o pedido"} «${t.title}»${supplier ? ` a ${supplier.name}` : ""} (template)`,
        supplierId: supplier?.id ?? null,
      });
    }
    return NextResponse.json({ created });
  } catch (e) {
    return accessErrorResponse(e);
  }
}
