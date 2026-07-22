import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createSupplierInvite, createCoupleInvite } from "@/lib/db/invites";
import { assertWeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Issue an invite link for the couple or a supplier slot. Venue (owner) or admin
 * only. Body: { role: "couple", email? } | { role: "supplier", supplierId, email?, service? }. */
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
  const email = typeof b?.email === "string" && b.email.trim() ? b.email.trim() : null;

  if (b?.role === "couple") {
    const token = await createCoupleInvite(id, email);
    return NextResponse.json({ token, role: "couple" }, { status: 201 });
  }

  if (b?.role === "supplier") {
    if (!b?.supplierId) return NextResponse.json({ error: "supplierId required" }, { status: 400 });
    const supplier = await prisma.supplier.findUnique({
      where: { id: b.supplierId },
      select: { weddingId: true },
    });
    if (!supplier || supplier.weddingId !== id) {
      return NextResponse.json({ error: "fornecedor inválido" }, { status: 400 });
    }
    const service = typeof b?.service === "string" && b.service.trim() ? b.service.trim() : null;
    const token = await createSupplierInvite(id, b.supplierId, { email, service });
    return NextResponse.json({ token, role: "supplier" }, { status: 201 });
  }

  return NextResponse.json({ error: 'role deve ser "couple" ou "supplier"' }, { status: 400 });
}
