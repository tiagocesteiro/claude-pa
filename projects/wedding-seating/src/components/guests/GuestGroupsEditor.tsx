"use client";

import { useState } from "react";
import type { Group, Guest } from "./useGuestBoard";

function parseExtraGroups(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // malformed data — treat as no extra groups
  }
  return [];
}

export default function GuestGroupsEditor({
  guest,
  groups,
  setGuestGroups,
  onClose,
}: {
  guest: Guest;
  groups: Group[];
  setGuestGroups: (
    guestId: string,
    primaryGroupId: string | null,
    extraGroupIds: string[]
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [primaryGroupId, setPrimaryGroupId] = useState(guest.groupId ?? "");
  const [extraGroupIds, setExtraGroupIds] = useState<string[]>(() =>
    parseExtraGroups(guest.extraGroups)
  );
  const [addValue, setAddValue] = useState("");
  const [saving, setSaving] = useState(false);

  const usedIds = new Set<string>([primaryGroupId, ...extraGroupIds].filter(Boolean));
  const availableToAdd = groups.filter((g) => !usedIds.has(g.id));

  function nameOf(id: string): string {
    return groups.find((g) => g.id === id)?.name ?? "?";
  }

  function handlePrimaryChange(newId: string) {
    setPrimaryGroupId(newId);
    // A group can't be both primary and an extra — drop it from the extras if present.
    setExtraGroupIds((prev) => prev.filter((id) => id !== newId));
  }

  function handleAddExtra() {
    if (!addValue) return;
    setExtraGroupIds((prev) => [...prev, addValue]);
    setAddValue("");
  }

  function handleRemoveExtra(id: string) {
    setExtraGroupIds((prev) => prev.filter((g) => g !== id));
  }

  function handleMove(index: number, direction: -1 | 1) {
    setExtraGroupIds((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setGuestGroups(guest.id, primaryGroupId || null, extraGroupIds);
    } finally {
      setSaving(false);
    }
    onClose();
  }

  return (
    <div
      data-testid={`guest-groups-editor-${guest.id}`}
      style={{
        border: "1px solid #ccc",
        borderRadius: 6,
        padding: 8,
        marginTop: 6,
        background: "#f9fafb",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 12, color: "#666" }}>
          Grupo principal:{" "}
          <select
            value={primaryGroupId}
            onChange={(e) => handlePrimaryChange(e.target.value)}
          >
            <option value="">Sem grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
        Grupos extra (por ordem de prioridade):
      </div>
      {extraGroupIds.length === 0 && (
        <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>Nenhum grupo extra.</div>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {extraGroupIds.map((id, index) => (
          <li
            key={id}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0" }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>
              {index + 1}. {nameOf(id)}
            </span>
            <button
              type="button"
              onClick={() => handleMove(index, -1)}
              disabled={index === 0}
              title="Subir prioridade"
              style={{ fontSize: 11 }}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => handleMove(index, 1)}
              disabled={index === extraGroupIds.length - 1}
              title="Descer prioridade"
              style={{ fontSize: 11 }}
            >
              ▼
            </button>
            <button
              type="button"
              onClick={() => handleRemoveExtra(id)}
              title="Remover grupo extra"
              style={{ fontSize: 11 }}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 6 }}>
        <select value={addValue} onChange={(e) => setAddValue(e.target.value)}>
          <option value="">Adicionar grupo extra...</option>
          {availableToAdd.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleAddExtra} disabled={!addValue} style={{ fontSize: 12 }}>
          Adicionar
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={handleSave} disabled={saving} style={{ fontSize: 12 }}>
          {saving ? "A guardar..." : "Guardar"}
        </button>
        <button type="button" onClick={onClose} disabled={saving} style={{ fontSize: 12 }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
