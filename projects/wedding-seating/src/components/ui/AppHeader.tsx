"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./Button";
import Badge from "./Badge";
import Wordmark from "./Wordmark";

interface Me {
  user: { id: string; email: string | null } | null;
  role?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  venue: "Quinta",
  couple: "Casal",
  admin: "Admin",
};

/**
 * Shared app header for the /admin area: elegant wordmark (placeholder — F2
 * swaps the real logo/name), the logged-in email, a role badge, and "Sair".
 * If there's no session it renders nothing (no route enforcement here).
 */
export default function AppHeader() {
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

  const roleLabel = me.role ? ROLE_LABELS[me.role] : null;

  return (
    <header className="app-header">
      <Wordmark href="/admin" />
      <div className="app-header-right">
        {roleLabel && (
          <Badge tone="accent" className="app-header-role">
            {roleLabel}
          </Badge>
        )}
        <span className="app-header-email">{me.user.email}</span>
        <Button variant="secondary" size="sm" onClick={handleLogout} loading={loggingOut}>
          {loggingOut ? "A sair..." : "Sair"}
        </Button>
      </div>
    </header>
  );
}
