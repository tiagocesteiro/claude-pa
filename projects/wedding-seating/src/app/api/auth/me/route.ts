import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/serverClient";
import { getProfile } from "@/lib/db/profiles";

/** Returns the logged-in user (email + role) for the shared admin header, or null. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  const profile = await getProfile(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email }, role: profile?.role ?? null });
}
