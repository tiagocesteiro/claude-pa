"use client";

import { useState } from "react";
import type { Group } from "./useGuestBoard";
import DietaryDatalist from "./DietaryDatalist";
import { DIETARY_DATALIST_ID } from "@/lib/labels";

// Same "adult"/"child"/"senior" values normalized by lib/import/parseGuests.ts, so a
// manually-added guest colors/filters identically to one brought in via bulk import.
const AGE_GROUP_OPTIONS: { label: string; value: string }[] = [
  { label: "—", value: "" },
  { label: "Adulto", value: "adult" },
  { label: "Criança", value: "child" },
  { label: "Idoso", value: "senior" },
];

export default function AddGuestForm({
  groups,
  addGuest,
}: {
  groups: Group[];
  addGuest: (
    name: string,
    groupId?: string | null,
    attrs?: { ageGroup?: string | null; gender?: string | null; dietary?: string | null }
  ) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("");
  const [dietary, setDietary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await addGuest(name.trim(), groupId || null, {
        ageGroup: ageGroup || null,
        gender: gender.trim() || null,
        dietary: dietary.trim() || null,
      });
      setName("");
      setGroupId("");
      setAgeGroup("");
      setGender("");
      setDietary("");
    } catch {
      setError("Não foi possível adicionar o convidado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", padding: 14, marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Adicionar convidado</h2>
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
        <select
          data-testid="add-guest-age-group"
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
          title="Faixa etária"
        >
          {AGE_GROUP_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          data-testid="add-guest-gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          placeholder="Género"
          style={{ width: 90 }}
        />
        <input
          list={DIETARY_DATALIST_ID}
          data-testid="add-guest-dietary"
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
          placeholder="Alimentar (ex: vegetariana)"
        />
        <DietaryDatalist />
        <button type="submit" disabled={saving || !name.trim()}>
          {saving ? "A adicionar..." : "Adicionar convidado"}
        </button>
      </form>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
