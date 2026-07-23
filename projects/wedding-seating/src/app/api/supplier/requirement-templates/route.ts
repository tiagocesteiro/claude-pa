import { NextResponse } from "next/server";
import { listSupplierTemplates, createSupplierTemplate } from "@/lib/db/requirementTemplates";
import { requireActor } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The current supplier account's reusable request templates. Supplier-only. */
export async function GET() {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  if (actor.role !== "supplier" && actor.role !== "admin") {
    return NextResponse.json({ error: "Apenas fornecedores." }, { status: 403 });
  }
  return NextResponse.json({ templates: await listSupplierTemplates(actor.userId) });
}

export async function POST(req: Request) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  if (actor.role !== "supplier" && actor.role !== "admin") {
    return NextResponse.json({ error: "Apenas fornecedores." }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  const title = typeof b?.title === "string" && b.title.trim() ? b.title.trim() : null;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const rawData = (b?.data ?? {}) as Record<string, unknown>;
  const data: { tables?: number; linearMeters?: number; time?: string } = {};
  if (rawData.tables != null && rawData.tables !== "" && Number.isFinite(Number(rawData.tables))) data.tables = Number(rawData.tables);
  if (rawData.linearMeters != null && rawData.linearMeters !== "" && Number.isFinite(Number(rawData.linearMeters))) data.linearMeters = Number(rawData.linearMeters);
  if (typeof rawData.time === "string" && rawData.time.trim()) data.time = rawData.time.trim();

  const template = await createSupplierTemplate(actor.userId, {
    kind: b?.kind === "question" ? "question" : "request",
    targetRole: b?.targetRole === "couple" ? "couple" : "venue",
    title,
    detail: typeof b?.detail === "string" && b.detail.trim() ? b.detail.trim() : null,
    data: Object.keys(data).length > 0 ? data : null,
  });
  return NextResponse.json({ template }, { status: 201 });
}
