import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getMoment, updateMoment, deleteMoment } from "@/lib/db/moments";
import { listMomentTasks } from "@/lib/db/tasks";
import { listMomentDecor } from "@/lib/db/momentDecor";
import { assertMomentAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The moment aggregate the couple's moment page needs: meta + tasks + decor
 * (+ the template's floor plan for the arrangement thumbnail). */
export async function GET(_req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentAccess(actor, momentId, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const moment = await prisma.weddingMoment.findUnique({
    where: { id: momentId },
    include: { template: { include: { floorPlan: true } } },
  });
  if (!moment) return NextResponse.json({ error: "moment não encontrado" }, { status: 404 });
  const [tasks, decor] = await Promise.all([listMomentTasks(momentId), listMomentDecor(momentId)]);
  return NextResponse.json({ moment, tasks, decor });
}

/** Rename / reorder a moment, or set its venue arrangement (template/floor plan,
 * validated against the wedding's venue). */
export async function PATCH(req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentAccess(actor, momentId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }

  const moment = await getMoment(momentId);
  if (!moment) return NextResponse.json({ error: "moment não encontrado" }, { status: 404 });
  const b = await req.json().catch(() => ({}));

  const fields: { title?: string; order?: number; templateId?: string | null; floorPlanId?: string | null } = {};
  if (typeof b?.title === "string" && b.title.trim()) fields.title = b.title.trim();
  if (typeof b?.order === "number") fields.order = b.order;

  // Arrangement (template/floor plan) must belong to the wedding's venue.
  if ("templateId" in b || "floorPlanId" in b) {
    const wedding = await prisma.wedding.findUnique({
      where: { id: moment.weddingId },
      select: { venueId: true },
    });
    if ("templateId" in b) {
      const templateId: string | null = b.templateId ?? null;
      if (templateId) {
        const tpl = await prisma.layoutTemplate.findUnique({ where: { id: templateId }, select: { venueId: true } });
        if (!tpl || tpl.venueId !== wedding?.venueId) {
          return NextResponse.json({ error: "arranjo não pertence à quinta" }, { status: 400 });
        }
      }
      fields.templateId = templateId;
    }
    if ("floorPlanId" in b) {
      const floorPlanId: string | null = b.floorPlanId ?? null;
      if (floorPlanId) {
        const fp = await prisma.floorPlan.findUnique({ where: { id: floorPlanId }, select: { venueId: true } });
        if (!fp || fp.venueId !== wedding?.venueId) {
          return NextResponse.json({ error: "planta não pertence à quinta" }, { status: 400 });
        }
      }
      fields.floorPlanId = floorPlanId;
    }
  }

  return NextResponse.json({ moment: await updateMoment(momentId, fields) });
}

/** Delete a moment (its tasks + decor cascade). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentAccess(actor, momentId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteMoment(momentId);
  return NextResponse.json({ ok: true });
}
