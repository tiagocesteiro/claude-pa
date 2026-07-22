import { NextResponse } from "next/server";
import { getInvitePreview, acceptInvite } from "@/lib/db/invites";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Preview an invite (for the accept landing page). Any logged-in user. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { token } = await params;
  const inv = await getInvitePreview(token);
  if (!inv) return NextResponse.json({ error: "convite inválido ou expirado" }, { status: 404 });
  return NextResponse.json({
    role: inv.role,
    service: inv.service,
    alreadyAccepted: Boolean(inv.acceptedById),
    wedding: inv.wedding,
  });
}

/** Accept the invite as the current user → become a participant of the wedding. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { token } = await params;
  try {
    const inv = await acceptInvite(token, actor.userId);
    if (!inv) return NextResponse.json({ error: "convite inválido ou expirado" }, { status: 404 });
    return NextResponse.json({ ok: true, weddingId: inv.weddingId, role: inv.role });
  } catch (e) {
    return accessErrorResponse(e);
  }
}
