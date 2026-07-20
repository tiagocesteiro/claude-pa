import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { applyTemplateToWedding } from "@/lib/db/weddingTables";
import { getWedding } from "@/lib/db/weddings";
import { assertWeddingAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  if (!b?.templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  const wedding = await getWedding(id);
  if (!wedding) return NextResponse.json({ error: "wedding not found" }, { status: 404 });

  const template = await prisma.layoutTemplate.findUnique({ where: { id: b.templateId } });
  if (!template) {
    return NextResponse.json({ error: "template not found" }, { status: 404 });
  }
  // Security (review H1): a couple may only apply an arrangement from the venue
  // their wedding actually booked — never an arbitrary venue's template. Mirrors
  // the same check the moments route enforces.
  if (template.venueId !== wedding.venueId) {
    return NextResponse.json(
      { error: "arranjo não pertence à quinta do casamento" },
      { status: 400 }
    );
  }

  const result = await applyTemplateToWedding(id, b.templateId);
  return NextResponse.json(result);
}
