import { NextResponse } from "next/server";
import { listServices, addService, type ProviderType } from "@/lib/db/services";
import { assertWeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

const PROVIDER_TYPES: ProviderType[] = ["venue", "supplier", "couple"];

/** The responsibility matrix of a wedding. Any participant may read it (no PII);
 * only the venue (owner) or admin may declare/assign services. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, ["venue", "couple", "supplier", "admin"]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ services: await listServices(id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, ["venue", "admin"]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const kind = typeof b?.kind === "string" && b.kind.trim() ? b.kind.trim() : null;
  if (!kind) return NextResponse.json({ error: "kind required" }, { status: 400 });
  const providerType: ProviderType = PROVIDER_TYPES.includes(b?.providerType) ? b.providerType : "venue";
  const service = await addService(id, {
    kind,
    name: typeof b?.name === "string" && b.name.trim() ? b.name.trim() : null,
    providerType,
    supplierId: typeof b?.supplierId === "string" ? b.supplierId : null,
    note: typeof b?.note === "string" && b.note.trim() ? b.note.trim() : null,
  });
  return NextResponse.json({ service }, { status: 201 });
}
