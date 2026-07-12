import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { applyTemplateToWedding } from "@/lib/db/weddingTables";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
