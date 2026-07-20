import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { applyTemplateToWedding } from "@/lib/db/weddingTables";
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

  const template = await prisma.layoutTemplate.findUnique({ where: { id: b.templateId } });
  if (!template) {
    return NextResponse.json({ error: "template not found" }, { status: 404 });
  }

  const result = await applyTemplateToWedding(id, b.templateId);
  return NextResponse.json(result);
}
