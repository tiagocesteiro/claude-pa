import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getOrCreateProfile } from "@/lib/db/profiles";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email e password são obrigatórios." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Credenciais inválidas." }, { status: 401 });
  }

  // Ensure a Profile exists even if signup's Profile-creation step never ran
  // (e.g. user created directly in Supabase). Defaults to "couple" if new.
  const profile = await getOrCreateProfile(data.user);

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email }, role: profile.role });
}
