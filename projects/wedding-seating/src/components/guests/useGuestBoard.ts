"use client";

import { useCallback, useEffect, useState } from "react";

export interface Guest {
  id: string;
  weddingId: string;
  name: string;
  groupId: string | null;
  assignedTableId: string | null;
}

export interface Group {
  id: string;
  weddingId: string;
  name: string;
  color: string | null;
}

export function useGuestBoard(weddingId: string) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [guestsRes, groupsRes] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/guests`),
      fetch(`/api/weddings/${weddingId}/groups`),
    ]);
    if (guestsRes.ok) setGuests(await guestsRes.json());
    if (groupsRes.ok) setGroups(await groupsRes.json());
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    refresh();
  }, [refresh]);

  const assign = useCallback(
    async (guestId: string, groupId: string | null) => {
      await fetch(`/api/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      await refresh();
    },
    [refresh]
  );

  const addGroup = useCallback(
    async (name: string) => {
      await fetch(`/api/weddings/${weddingId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await refresh();
    },
    [weddingId, refresh]
  );

  const renameGroup = useCallback(
    async (id: string, name: string) => {
      await fetch(`/api/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await refresh();
    },
    [refresh]
  );

  const removeGroup = useCallback(
    async (id: string) => {
      const stragglers = guests.filter((g) => g.groupId === id);
      for (const guest of stragglers) {
        await fetch(`/api/guests/${guest.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: null }),
        });
      }
      await fetch(`/api/groups/${id}`, { method: "DELETE" });
      await refresh();
    },
    [guests, refresh]
  );

  return { guests, groups, loading, refresh, assign, addGroup, renameGroup, removeGroup };
}
