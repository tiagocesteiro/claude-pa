"use client";

import { useCallback, useEffect, useState } from "react";

interface Constraint {
  id: string;
  weddingId: string;
  type: "together" | "separate";
  guestAId: string;
  guestBId: string;
}

/** Only id + name are used — accepts any guest-like list (the guest board's full
 * Guest, or the seating editor's PlanGuest). */
export default function ConstraintsPanel({
  weddingId,
  guests,
}: {
  weddingId: string;
  guests: { id: string; name: string }[];
}) {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [guestAId, setGuestAId] = useState("");
  const [guestBId, setGuestBId] = useState("");
  const [type, setType] = useState<"together" | "separate">("separate");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}/constraints`);
    if (res.ok) setConstraints(await res.json());
  }, [weddingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (guests.length === 0) return;
    if (!guestAId) setGuestAId(guests[0].id);
    if (!guestBId) setGuestBId(guests.length > 1 ? guests[1].id : guests[0].id);
  }, [guests, guestAId, guestBId]);

  function nameOf(id: string) {
    return guests.find((g) => g.id === id)?.name ?? "?";
  }

  async function submitConstraint(constraintType: "together" | "separate") {
    if (!guestAId || !guestBId || guestAId === guestBId) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/constraints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: constraintType, guestAId, guestBId }),
      });
      if (!res.ok) setError("Não foi possível criar a restrição.");
    } catch {
      setError("Não foi possível criar a restrição.");
    } finally {
      setSaving(false);
    }
    await refresh();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await submitConstraint(type);
  }

  async function handleCouple() {
    setType("together");
    await submitConstraint("together");
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/constraints/${id}`, { method: "DELETE" });
      if (!res.ok) setError("Não foi possível remover a restrição.");
    } catch {
      setError("Não foi possível remover a restrição.");
    } finally {
      setDeletingId(null);
    }
    await refresh();
  }

  const sameGuest = guestAId !== "" && guestAId === guestBId;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginTop: 24 }}>
      <h2>Constraints</h2>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={guestAId} onChange={(e) => setGuestAId(e.target.value)}>
          {guests.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <select value={type} onChange={(e) => setType(e.target.value as "together" | "separate")}>
          <option value="separate">não pode ficar com</option>
          <option value="together">tem de ficar com</option>
        </select>

        <select value={guestBId} onChange={(e) => setGuestBId(e.target.value)}>
          {guests.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <button type="submit" disabled={saving || sameGuest || !guestAId || !guestBId}>
          {saving ? "A adicionar..." : "Adicionar"}
        </button>

        <button
          type="button"
          onClick={handleCouple}
          disabled={saving || sameGuest || !guestAId || !guestBId}
          title="Marca os dois convidados selecionados como casal (têm de ficar juntos)"
        >
          {saving ? "A adicionar..." : "São casal"}
        </button>
      </form>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
        {constraints.map((c) => (
          <li
            key={c.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>
              {nameOf(c.guestAId)} —{" "}
              {c.type === "separate" ? "não pode ficar com" : "tem de ficar com"} — {nameOf(c.guestBId)}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(c.id)}
              disabled={deletingId !== null}
              style={{ fontSize: 12 }}
            >
              {deletingId === c.id ? "A apagar..." : "Apagar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
