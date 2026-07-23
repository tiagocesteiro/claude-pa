import { NextResponse } from "next/server";
import { listRequirementTemplates, createRequirementTemplate } from "@/lib/db/requirementTemplates";
import { assertVenueAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertVenueAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ templates: await listRequirementTemplates(id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertVenueAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const title = typeof b?.title === "string" && b.title.trim() ? b.title.trim() : null;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const rawData = (b?.data ?? {}) as Record<string, unknown>;
  const data: { tables?: number; linearMeters?: number; time?: string } = {};
  if (rawData.tables != null && rawData.tables !== "" && Number.isFinite(Number(rawData.tables))) data.tables = Number(rawData.tables);
  if (rawData.linearMeters != null && rawData.linearMeters !== "" && Number.isFinite(Number(rawData.linearMeters))) data.linearMeters = Number(rawData.linearMeters);
  if (typeof rawData.time === "string" && rawData.time.trim()) data.time = rawData.time.trim();

  const template = await createRequirementTemplate(id, {
    kind: b?.kind === "question" ? "question" : "request",
    service: typeof b?.service === "string" && b.service.trim() ? b.service.trim() : null,
    title,
    detail: typeof b?.detail === "string" && b.detail.trim() ? b.detail.trim() : null,
    data: Object.keys(data).length > 0 ? data : null,
  });
  return NextResponse.json({ template }, { status: 201 });
}
