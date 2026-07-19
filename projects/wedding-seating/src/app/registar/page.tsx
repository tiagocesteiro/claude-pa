"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Role = "venue" | "couple";

export default function RegistarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("couple");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Não foi possível criar a conta.");
        return;
      }
      if (data.needsConfirmation) {
        setNeedsConfirmation(true);
        return;
      }
      // Email confirmation disabled → signUp already returned a session.
      router.push("/admin");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
          padding: 28,
        }}
      >
        <h1 style={{ marginBottom: 4 }}>Criar conta</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
          Wedding Seating Planner
        </p>

        {needsConfirmation ? (
          <p>
            Confirma o teu email para entrar. Enviámos um link de confirmação para{" "}
            <strong>{email}</strong>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <fieldset style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 12 }}>
              <legend style={{ padding: "0 6px", color: "var(--text-muted)" }}>Eu sou...</legend>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <input
                  type="radio"
                  name="role"
                  value="venue"
                  checked={role === "venue"}
                  onChange={() => setRole("venue")}
                />
                Sou uma Quinta
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="role"
                  value="couple"
                  checked={role === "couple"}
                  onChange={() => setRole("couple")}
                />
                Sou um Casal
              </label>
            </fieldset>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            {error && <p style={{ color: "#dc2626" }}>{error}</p>}

            <button type="submit" disabled={submitting} style={{ marginTop: 8 }}>
              {submitting ? "A criar conta..." : "Criar conta"}
            </button>
          </form>
        )}

        <p style={{ marginTop: 20, textAlign: "center", color: "var(--text-muted)" }}>
          Já tens conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
