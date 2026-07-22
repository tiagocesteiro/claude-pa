import { NextResponse } from "next/server";
import { getWeddingRole, getSupplierWeddingView } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { AccessError } from "@/lib/auth/access";

export const runtime = "nodejs";

/** A supplier's scoped, PII-free view of one wedding they're on. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    const role = await getWeddingRole(actor, id);
    if (!role || (role.role !== "supplier" && role.role !== "admin")) {
      throw new AccessError(403, "Sem acesso a este casamento.");
    }
    const view = await getSupplierWeddingView(id, role.supplierId ?? null);
    if (!view) return NextResponse.json({ error: "casamento não encontrado" }, { status: 404 });
    return NextResponse.json(view);
  } catch (e) {
    return accessErrorResponse(e);
  }
}
