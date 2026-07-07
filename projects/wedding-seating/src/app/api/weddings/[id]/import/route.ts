import { NextResponse } from "next/server";
import { parseGuestWorkbook } from "@/lib/import/parseGuests";
import { importGuests } from "@/lib/import/importGuests";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  const rows = await parseGuestWorkbook(await file.arrayBuffer());
  const result = await importGuests(id, rows);
  return NextResponse.json(result);
}
