"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Me {
  user: { id: string; email: string | null } | null;
  role?: string | null;
}

/** Shared header for the /admin area: shows the logged-in email + a "Sair" button.
 * No route enforcement here (Fase D) — if there's no session it just shows nothing. */
export default function AuthHeader() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadMe() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const data = (await res.json()) as Me;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
      setMe(data);
    }
    loadMe();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (!me?.user) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 12,
        padding: "10px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface-2)",
      }}
    >
      <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{me.user.email}</span>
      <button type="button" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? "A sair..." : "Sair"}
      </button>
    </div>
  );
}
