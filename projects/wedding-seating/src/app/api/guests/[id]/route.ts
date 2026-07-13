import { NextResponse } from "next/server";
import { assignGuestGroup, isRsvpValue, setGuestLocked, updateGuestAttributes } from "@/lib/db/guests";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if ("rsvp" in b && !isRsvpValue(b.rsvp)) {
    return NextResponse.json({ error: "rsvp inválido" }, { status: 400 });
  }
  let updated;
  if ("groupId" in b) updated = await assignGuestGroup(id, b.groupId);
  if (typeof b.locked === "boolean") updated = await setGuestLocked(id, b.locked);
  if ("ageGroup" in b || "gender" in b || "dietary" in b || "rsvp" in b) {
    const attrs: {
      ageGroup?: string | null;
      gender?: string | null;
      dietary?: string | null;
      rsvp?: string | null;
    } = {};
    if ("ageGroup" in b) attrs.ageGroup = b.ageGroup ?? null;
    if ("gender" in b) attrs.gender = b.gender ?? null;
    if ("dietary" in b) attrs.dietary = b.dietary ?? null;
    if ("rsvp" in b) attrs.rsvp = b.rsvp;
    updated = await updateGuestAttributes(id, attrs);
  }
  if (!updated) {
    return NextResponse.json(
      { error: "groupId, locked, or an attribute required" },
      { status: 400 }
    );
  }
  return NextResponse.json(updated);
}
