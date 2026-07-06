import { NextResponse } from "next/server";
import { saveTables, listTables, type TableInput } from "@/lib/db/tables";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listTables(id));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { tables: TableInput[] };
  if (!Array.isArray(body?.tables)) return NextResponse.json({ error: "tables[] required" }, { status: 400 });
  await saveTables(id, body.tables);
  return NextResponse.json({ ok: true });
}
