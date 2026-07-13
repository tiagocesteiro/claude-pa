import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { setPlusOne } from "@/lib/db/guests";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));

  if (b.partnerId !== null && typeof b.partnerId !== "string") {
    return NextResponse.json({ error: "partnerId must be a string or null" }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({ where: { id } });
  if (!guest) {
    return NextResponse.json({ error: "Convidado não encontrado" }, { status: 404 });
  }

  if (b.partnerId !== null) {
    if (b.partnerId === id) {
      return NextResponse.json(
        { error: "Um convidado não pode ser o seu próprio par" },
        { status: 400 }
      );
    }
    const partner = await prisma.guest.findUnique({ where: { id: b.partnerId } });
    if (!partner || partner.weddingId !== guest.weddingId) {
      return NextResponse.json({ error: "Par inválido" }, { status: 400 });
    }
  }

  const updated = await setPlusOne(id, b.partnerId);
  if (!updated) {
    return NextResponse.json({ error: "Não foi possível emparelhar" }, { status: 400 });
  }
  return NextResponse.json(updated);
}
