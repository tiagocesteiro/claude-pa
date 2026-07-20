import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getMoment } from "@/lib/db/moments";
import { listLayouts, createLayoutFromTemplate, createBlankLayout } from "@/lib/db/layouts";
import { assertMomentAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** List a moment's layouts (with table + seated counts). */
export async function GET(_req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentAccess(actor, momentId, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ layouts: await listLayouts(momentId) });
}

/** Create a layout for this moment (from a venue template, or a blank room). */
export async function POST(req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentAccess(actor, momentId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }

  const moment = await getMoment(momentId);
  if (!moment) return NextResponse.json({ error: "momento não encontrado" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const name = typeof b?.name === "string" && b.name.trim() ? b.name.trim() : null;

  if (b?.source === "template") {
    if (!b?.templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });
    const template = await prisma.layoutTemplate.findUnique({
      where: { id: b.templateId },
      select: { venueId: true, name: true },
    });
    if (!template) return NextResponse.json({ error: "template not found" }, { status: 404 });
    const wedding = await prisma.wedding.findUnique({
      where: { id: moment.weddingId },
      select: { venueId: true },
    });
    if (template.venueId !== wedding?.venueId) {
      return NextResponse.json({ error: "arranjo não pertence à quinta do casamento" }, { status: 400 });
    }
    const layout = await createLayoutFromTemplate(momentId, b.templateId, name ?? template.name);
    return NextResponse.json({ layout }, { status: 201 });
  }

  if (b?.source === "blank") {
    const width = Number(b?.width);
    const depth = Number(b?.depth);
    const scale = Number(b?.scale);
    if (![width, depth, scale].every((n) => Number.isFinite(n) && n > 0)) {
      return NextResponse.json({ error: "width, depth e scale têm de ser números positivos" }, { status: 400 });
    }
    const layout = await createBlankLayout(momentId, { name: name ?? "Nova sala", width, depth, scale });
    return NextResponse.json({ layout }, { status: 201 });
  }

  return NextResponse.json({ error: 'source deve ser "template" ou "blank"' }, { status: 400 });
}
