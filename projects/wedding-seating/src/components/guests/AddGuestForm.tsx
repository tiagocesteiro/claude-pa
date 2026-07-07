"use client";

import { useState } from "react";
import type { Group } from "./useGuestBoard";

export default function AddGuestForm({
  groups,
  addGuest,
}: {
  groups: Group[];
  addGuest: (name: string, groupId?: string | null) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await addGuest(name.trim(), groupId || null);
      setName("");
      setGroupId("");
    } catch {
      setError("Não foi possível adicionar o convidado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 24 }}>
      <h2>Adicionar convidado</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do convidado"
        />
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Sem grupo</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={saving || !name.trim()}>
          {saving ? "A adicionar..." : "Adicionar convidado"}
        </button>
      </form>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
