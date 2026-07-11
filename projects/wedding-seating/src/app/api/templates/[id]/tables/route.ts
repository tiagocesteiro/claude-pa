import { NextResponse } from "next/server";
import { saveTemplateTables, listTemplateTables } from "@/lib/db/templateTables";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listTemplateTables(id));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!Array.isArray(b?.tables)) {
    return NextResponse.json({ error: "tables array required" }, { status: 400 });
  }
  await saveTemplateTables(id, b.tables);
  return NextResponse.json({ ok: true });
}
