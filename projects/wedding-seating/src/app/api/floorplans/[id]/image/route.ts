import { NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/upload";
import { prisma } from "@/lib/db/client";

// Node runtime (filesystem/Buffer + prisma); headroom for the multipart upload (Fase 0).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  const existing = await prisma.floorPlan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Esta planta já não existe. Volta aos Layouts e cria uma nova." },
      { status: 404 }
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const rel = await saveUploadedImage(id, file.name, bytes);
  await prisma.floorPlan.update({ where: { id }, data: { image: rel } });
  return NextResponse.json({ image: rel });
}
