import { NextResponse } from "next/server";
import { saveAssignment } from "@/lib/db/assignment";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params; // wedding id not needed beyond scoping; guests are updated by id
  const b = await req.json().catch(() => ({}));
  if (!Array.isArray(b?.assignments)) {
    return NextResponse.json({ error: "assignments[] required" }, { status: 400 });
  }
  await saveAssignment(b.assignments);
  return NextResponse.json({ ok: true });
}
