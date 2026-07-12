import { NextResponse } from "next/server";
import { saveWeddingTables, listWeddingTables, type WeddingTableInput } from "@/lib/db/weddingTables";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listWeddingTables(id));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { tables?: WeddingTableInput[] };
  if (!Array.isArray(body?.tables)) return NextResponse.json({ error: "tables[] required" }, { status: 400 });
  await saveWeddingTables(id, body.tables);
  return NextResponse.json({ ok: true });
}
