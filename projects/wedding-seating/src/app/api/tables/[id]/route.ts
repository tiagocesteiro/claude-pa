import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (typeof b?.fixed !== "boolean") return NextResponse.json({ error: "fixed (boolean) required" }, { status: 400 });
  const table = await prisma.table.update({ where: { id }, data: { fixed: b.fixed } });
  return NextResponse.json(table);
}
