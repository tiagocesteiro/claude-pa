import { NextResponse } from "next/server";
import { addComment, getRequirement } from "@/lib/db/requirements";
import { assertRequirementAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent } from "@/lib/db/audit";

export const runtime = "nodejs";

/** Reply on a requirement — the two-way layer of the ledger. Requires "write"
 * involvement (venue/admin, or a party the requirement concerns). */
export async function POST(req: Request, { params }: { params: Promise<{ requirementId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { requirementId } = await params;
  let role: string;
  let supplierId: string | null = null;
  try {
    const wr = await assertRequirementAccess(actor, requirementId, "write");
    role = wr.role;
    supplierId = wr.role === "supplier" ? wr.supplierId ?? null : null;
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const text = typeof b?.text === "string" && b.text.trim() ? b.text.trim() : null;
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const comment = await addComment(requirementId, { authorRole: role, authorProfileId: actor.userId, text });

  const req_ = await getRequirement(requirementId);
  if (req_) {
    await recordEvent({
      weddingId: req_.weddingId,
      actor,
      action: "requirement.comment_added",
      entityType: "requirement",
      entityId: requirementId,
      summary: `Respondeu ${req_.kind === "question" ? "à dúvida" : "em"} «${req_.title}»: ${text}`,
      supplierId: req_.toSupplierId ?? supplierId,
    });
  }
  return NextResponse.json({ comment }, { status: 201 });
}
