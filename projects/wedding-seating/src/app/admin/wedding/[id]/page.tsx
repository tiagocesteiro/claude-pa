"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useGuestBoard } from "@/components/guests/useGuestBoard";
import ImportPanel from "@/components/guests/ImportPanel";
import GroupBoard from "@/components/guests/GroupBoard";
import ConstraintsPanel from "@/components/guests/ConstraintsPanel";

interface WeddingRecord {
  id: string;
  couple: string;
  date: string | null;
}

export default function WeddingWorkspacePage() {
  const params = useParams<{ id: string }>();
  const weddingId = params.id;

  const [wedding, setWedding] = useState<WeddingRecord | null>(null);
  const { guests, groups, loading, error, refresh, assign, addGroup, renameGroup, removeGroup } =
    useGuestBoard(weddingId);

  useEffect(() => {
    async function loadWedding() {
      const res = await fetch("/api/weddings");
      if (!res.ok) return;
      const all = (await res.json()) as WeddingRecord[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
      setWedding(all.find((w) => w.id === weddingId) ?? null);
    }
    loadWedding();
  }, [weddingId]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1>{wedding ? wedding.couple : "Wedding"}</h1>

      <p>
        <Link href={`/admin/wedding/${weddingId}/plan`}>Ver plano de mesas &rarr;</Link>
      </p>

      <ImportPanel weddingId={weddingId} onImported={refresh} />

      {loading ? (
        <p>Loading guests...</p>
      ) : (
        <>
          <GroupBoard
            guests={guests}
            groups={groups}
            error={error}
            assign={assign}
            addGroup={addGroup}
            renameGroup={renameGroup}
            removeGroup={removeGroup}
          />

          <ConstraintsPanel weddingId={weddingId} guests={guests} />
        </>
      )}
    </main>
  );
}
