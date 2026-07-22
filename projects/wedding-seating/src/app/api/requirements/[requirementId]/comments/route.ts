import { NextResponse } from "next/server";
import { addComment } from "@/lib/db/requirements";
import { assertRequirementAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Reply on a requirement — the two-way layer of the ledger. Requires "write"
 * involvement (venue/admin, or a party the requirement concerns). */
export async function POST(req: Request, { params }: { params: Promise<{ requirementId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { requirementId } = await params;
  let role: string;
  try {
    const wr = await assertRequirementAccess(actor, requirementId, "write");
    role = wr.role;
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const text = typeof b?.text === "string" && b.text.trim() ? b.text.trim() : null;
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const comment = await addComment(requirementId, { authorRole: role, authorProfileId: actor.userId, text });
  return NextResponse.json({ comment }, { status: 201 });
}
