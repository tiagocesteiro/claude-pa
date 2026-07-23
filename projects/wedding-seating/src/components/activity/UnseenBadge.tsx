"use client";

import { useEffect, useState } from "react";

/** Fetches the current user's per-wedding "novidades" (unseen activity) counts.
 * One call powers all the badges on a "my weddings" list. */
export function useUnseenCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/activity/unseen");
      if (res.ok) setCounts(((await res.json()) as { counts: Record<string, number> }).counts ?? {});
    })();
  }, []);
  return counts;
}

/** A small "N novidades" pill; renders nothing when the count is 0/undefined. */
export function UnseenPill({ count }: { count: number | undefined }) {
  if (!count) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "var(--accent)",
        color: "#fff",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        padding: "1px 8px",
        whiteSpace: "nowrap",
      }}
      title="Alterações desde a última vez que abriste"
    >
      {count} {count === 1 ? "novidade" : "novidades"}
    </span>
  );
}
