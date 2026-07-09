"use client";

import { useCallback, useEffect, useState } from "react";

export interface Guest {
  id: string;
  weddingId: string;
  name: string;
  groupId: string | null;
  extraGroups: string | null;
  assignedTableId: string | null;
  ageGroup: string | null;
  gender: string | null;
  dietary: string | null;
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
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      try {
        const res = await fetch(`/api/guests/${guestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId }),
        });
        if (!res.ok) setError("Não foi possível mover o convidado.");
      } catch {
        setError("Não foi possível mover o convidado.");
      }
      await refresh();
    },
    [refresh]
  );

  const addGuest = useCallback(
    async (
      name: string,
      groupId?: string | null,
      attrs?: { ageGroup?: string | null; gender?: string | null; dietary?: string | null }
    ) => {
      setError(null);
      try {
        const res = await fetch(`/api/weddings/${weddingId}/guests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            groupId: groupId ?? null,
            ageGroup: attrs?.ageGroup ?? null,
            gender: attrs?.gender ?? null,
            dietary: attrs?.dietary ?? null,
          }),
        });
        if (!res.ok) setError("Não foi possível adicionar o convidado.");
      } catch {
        setError("Não foi possível adicionar o convidado.");
      }
      await refresh();
    },
    [weddingId, refresh]
  );

  const addGroup = useCallback(
    async (name: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/weddings/${weddingId}/groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) setError("Não foi possível criar o grupo.");
      } catch {
        setError("Não foi possível criar o grupo.");
      }
      await refresh();
    },
    [weddingId, refresh]
  );

  const renameGroup = useCallback(
    async (id: string, name: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/groups/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) setError("Não foi possível renomear o grupo.");
      } catch {
        setError("Não foi possível renomear o grupo.");
      }
      await refresh();
    },
    [refresh]
  );

  const setGuestGroups = useCallback(
    async (guestId: string, primaryGroupId: string | null, extraGroupIds: string[]) => {
      setError(null);
      try {
        const res = await fetch(`/api/guests/${guestId}/groups`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ primaryGroupId, extraGroupIds }),
        });
        if (!res.ok) setError("Não foi possível atualizar os grupos do convidado.");
      } catch {
        setError("Não foi possível atualizar os grupos do convidado.");
      }
      await refresh();
    },
    [refresh]
  );

  const removeGroup = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const stragglers = guests.filter((g) => g.groupId === id);
        let failed = false;
        for (const guest of stragglers) {
          const res = await fetch(`/api/guests/${guest.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: null }),
          });
          if (!res.ok) failed = true;
        }
        const delRes = await fetch(`/api/groups/${id}`, { method: "DELETE" });
        if (!delRes.ok) failed = true;
        if (failed) setError("Não foi possível remover o grupo.");
      } catch {
        setError("Não foi possível remover o grupo.");
      }
      await refresh();
    },
    [guests, refresh]
  );

  return {
    guests,
    groups,
    loading,
    error,
    refresh,
    assign,
    addGuest,
    addGroup,
    renameGroup,
    removeGroup,
    setGuestGroups,
  };
}
