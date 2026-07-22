import { NextResponse } from "next/server";
import { listSuppliers, createSupplier } from "@/lib/db/suppliers";
import { assertWeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

// Suppliers are managed by the venue (owner) OR the couple (both participants).
const MANAGERS = ["venue", "couple", "admin"] as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, [...MANAGERS]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ suppliers: await listSuppliers(id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, [...MANAGERS]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const name = typeof b?.name === "string" && b.name.trim() ? b.name.trim() : null;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const supplier = await createSupplier(id, {
    name,
    service: typeof b?.service === "string" && b.service.trim() ? b.service.trim() : null,
    contact: typeof b?.contact === "string" && b.contact.trim() ? b.contact.trim() : null,
  });
  return NextResponse.json({ supplier }, { status: 201 });
}
