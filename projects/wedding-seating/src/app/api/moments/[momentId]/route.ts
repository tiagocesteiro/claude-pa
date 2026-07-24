import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getMoment, updateMoment, deleteMoment } from "@/lib/db/moments";
import { listMomentTasks } from "@/lib/db/tasks";
import { listMomentDecor } from "@/lib/db/momentDecor";
import { assertMomentAccess, assertWeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent } from "@/lib/db/audit";

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
  const moment = await getMoment(momentId);
  if (!moment) return NextResponse.json({ error: "moment não encontrado" }, { status: 404 });
  // Venue + couple may edit a moment; the venue owns structure (space), the couple
  // its content (arrangement/seating).
  try {
    await assertWeddingRole(actor, moment.weddingId, ["venue", "couple", "admin"]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));

  const fields: {
    title?: string;
    order?: number;
    templateId?: string | null;
    floorPlanId?: string | null;
    hasSeating?: boolean;
    startTime?: string | null;
    image?: string | null;
    spaceId?: string | null;
  } = {};
  if (typeof b?.title === "string" && b.title.trim()) fields.title = b.title.trim();
  if (typeof b?.order === "number") fields.order = b.order;
  if (typeof b?.hasSeating === "boolean") fields.hasSeating = b.hasSeating;
  if ("image" in b) fields.image = typeof b.image === "string" && b.image.trim() ? b.image.trim() : null;
  // Start time as "HH:MM" (or null to clear); loose validation.
  if ("startTime" in b) {
    const s = typeof b.startTime === "string" ? b.startTime.trim() : "";
    fields.startTime = /^\d{1,2}:\d{2}$/.test(s) ? s.padStart(5, "0") : null;
  }

  // Assign a venue space to the moment (venue-defined). The space must belong to
  // the wedding's venue; assigning it snapshots the space's photo as the hero.
  if ("spaceId" in b) {
    const spaceId: string | null = typeof b.spaceId === "string" && b.spaceId ? b.spaceId : null;
    if (spaceId) {
      const wedding = await prisma.wedding.findUnique({ where: { id: moment.weddingId }, select: { venueId: true } });
      const space = await prisma.venueSpace.findUnique({ where: { id: spaceId }, select: { venueId: true, image: true } });
      if (!space || space.venueId !== wedding?.venueId) {
        return NextResponse.json({ error: "espaço não pertence à quinta" }, { status: 400 });
      }
      fields.spaceId = spaceId;
      fields.image = space.image;
    } else {
      fields.spaceId = null;
      fields.image = null;
    }
  }

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

  const updated = await updateMoment(momentId, fields);
  if (fields.title !== undefined && fields.title !== moment.title) {
    await recordEvent({
      weddingId: moment.weddingId, actor, action: "moment.renamed", entityType: "moment", entityId: momentId,
      summary: `Renomeou um momento para «${fields.title}»`,
      changes: { title: { from: moment.title, to: fields.title } },
    });
  }
  return NextResponse.json({ moment: updated });
}

/** Delete a moment (its tasks + decor cascade). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  const before = await getMoment(momentId);
  if (!before) return NextResponse.json({ ok: true });
  // Only the venue (owner) may delete a moment — the couple can't.
  try {
    await assertWeddingRole(actor, before.weddingId, ["venue", "admin"]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteMoment(momentId);
  if (before) {
    await recordEvent({
      weddingId: before.weddingId, actor, action: "moment.deleted", entityType: "moment", entityId: momentId,
      summary: `Removeu o momento «${before.title ?? "sem nome"}»`,
    });
  }
  return NextResponse.json({ ok: true });
}
