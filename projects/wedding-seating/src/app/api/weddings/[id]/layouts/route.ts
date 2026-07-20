import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getWedding } from "@/lib/db/weddings";
import { listLayouts, createLayoutFromTemplate, createBlankLayout } from "@/lib/db/layouts";
import { assertWeddingAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** List the couple's layouts for a wedding (with table + seated counts). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ layouts: await listLayouts(id) });
}

/**
 * Create a new couple layout, either seeded from one of the wedding's venue
 * templates (`source: "template"`) or as a blank room defined by dimensions
 * (`source: "blank"`). The first layout of a wedding is marked final automatically.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }

  const wedding = await getWedding(id);
  if (!wedding) return NextResponse.json({ error: "casamento não encontrado" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const name = typeof b?.name === "string" && b.name.trim() ? b.name.trim() : null;

  if (b?.source === "template") {
    if (!b?.templateId) {
      return NextResponse.json({ error: "templateId required" }, { status: 400 });
    }
    const template = await prisma.layoutTemplate.findUnique({
      where: { id: b.templateId },
      select: { venueId: true, name: true },
    });
    if (!template) return NextResponse.json({ error: "template not found" }, { status: 404 });
    // Security (mirrors apply-template H1): only a template from the wedding's own
    // venue may seed a layout — never an arbitrary venue's template.
    if (template.venueId !== wedding.venueId) {
      return NextResponse.json(
        { error: "arranjo não pertence à quinta do casamento" },
        { status: 400 }
      );
    }
    const layout = await createLayoutFromTemplate(id, b.templateId, name ?? template.name);
    return NextResponse.json({ layout }, { status: 201 });
  }

  if (b?.source === "blank") {
    const width = Number(b?.width);
    const depth = Number(b?.depth);
    const scale = Number(b?.scale);
    if (![width, depth, scale].every((n) => Number.isFinite(n) && n > 0)) {
      return NextResponse.json(
        { error: "width, depth e scale têm de ser números positivos" },
        { status: 400 }
      );
    }
    const layout = await createBlankLayout(id, { name: name ?? "Nova sala", width, depth, scale });
    return NextResponse.json({ layout }, { status: 201 });
  }

  return NextResponse.json({ error: 'source deve ser "template" ou "blank"' }, { status: 400 });
}
