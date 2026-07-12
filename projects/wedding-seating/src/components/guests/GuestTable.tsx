"use client";

import { useState } from "react";
import type { Group, Guest } from "./useGuestBoard";
import GuestGroupsEditor from "./GuestGroupsEditor";

// Same "adult"/"child"/"senior" values used by AddGuestForm + import normalization.
const AGE_OPTIONS: { label: string; value: string }[] = [
  { label: "—", value: "" },
  { label: "Adulto", value: "adult" },
  { label: "Criança", value: "child" },
  { label: "Idoso", value: "senior" },
];
const AGE_LABELS: Record<string, string> = { adult: "Adulto", child: "Criança", senior: "Idoso" };

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid var(--border)",
  fontSize: 13,
  color: "var(--text-muted)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "6px 10px",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "middle",
};

export default function GuestTable({
  guests,
  groups,
  error,
  assign,
  addGroup,
  renameGroup,
  removeGroup,
  setGuestGroups,
  updateGuestAttrs,
}: {
  guests: Guest[];
  groups: Group[];
  error?: string | null;
  assign: (guestId: string, groupId: string | null) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  renameGroup: (id: string, name: string) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  setGuestGroups: (
    guestId: string,
    primaryGroupId: string | null,
    extraGroupIds: string[]
  ) => Promise<void>;
  updateGuestAttrs: (
    guestId: string,
    attrs: { ageGroup?: string | null; gender?: string | null; dietary?: string | null }
  ) => Promise<void>;
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? null;

  function extraGroupNames(guest: Guest): string[] {
    if (!guest.extraGroups) return [];
    try {
      const ids = JSON.parse(guest.extraGroups) as string[];
      return ids.map((id) => groupName(id)).filter((n): n is string => !!n);
    } catch {
      return [];
    }
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await addGroup(newGroupName.trim());
    setNewGroupName("");
  }

  async function commitRename(id: string) {
    if (renameValue.trim()) await renameGroup(id, renameValue.trim());
    setRenamingId(null);
  }

  async function handleRemoveGroup(id: string) {
    if (removingId) return;
    setRemovingId(id);
    try {
      await removeGroup(id);
    } finally {
      setRemovingId(null);
    }
  }

  const sorted = [...guests].sort((a, b) => a.name.localeCompare(b.name, "pt"));

  return (
    <div>
      {/* Groups management --------------------------------------------------- */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 9,
          padding: 12,
          marginBottom: 16,
          background: "var(--surface-2)",
        }}
      >
        <form onSubmit={handleAddGroup} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <strong style={{ color: "var(--heading)" }}>Grupos</strong>
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Novo grupo"
          />
          <button type="submit">Adicionar grupo</button>
        </form>
        {groups.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {groups.map((g) => (
              <span
                key={g.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "3px 10px",
                  background: "var(--surface)",
                }}
              >
                {renamingId === g.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(g.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(g.id);
                    }}
                    style={{ width: 120 }}
                  />
                ) : (
                  <span
                    onClick={() => {
                      setRenamingId(g.id);
                      setRenameValue(g.name);
                    }}
                    style={{ cursor: "pointer" }}
                    title="Clica para renomear"
                  >
                    {g.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(g.id)}
                  disabled={removingId !== null}
                  title="Remover grupo"
                  style={{ padding: "0 6px", fontSize: 12, color: "#dc2626" }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {guests.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Sem convidados ainda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 9,
            }}
          >
            <thead>
              <tr>
                <th style={th}>Nome</th>
                <th style={th}>Grupo</th>
                <th style={th}>Grupos extra</th>
                <th style={th}>Idade</th>
                <th style={th}>Género</th>
                <th style={th}>Dieta</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((guest) => {
                const extras = extraGroupNames(guest);
                const isEditing = editingGuestId === guest.id;
                return (
                  <tr key={guest.id} data-testid={`guest-row-${guest.id}`}>
                    <td style={td}>{guest.name}</td>
                    <td style={td}>
                      <select
                        value={guest.groupId ?? ""}
                        onChange={(e) => assign(guest.id, e.target.value || null)}
                        aria-label={`Grupo de ${guest.name}`}
                      >
                        <option value="">Sem grupo</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...td, minWidth: 160 }}>
                      <span style={{ color: extras.length ? "var(--text)" : "var(--text-muted)" }}>
                        {extras.length ? extras.join(", ") : "—"}
                      </span>{" "}
                      <button
                        type="button"
                        onClick={() => setEditingGuestId(isEditing ? null : guest.id)}
                        style={{ fontSize: 11, padding: "2px 8px" }}
                      >
                        {isEditing ? "Fechar" : "Editar"}
                      </button>
                      {isEditing && (
                        <GuestGroupsEditor
                          guest={guest}
                          groups={groups}
                          setGuestGroups={setGuestGroups}
                          onClose={() => setEditingGuestId(null)}
                        />
                      )}
                    </td>
                    <td style={td}>
                      <select
                        value={guest.ageGroup ?? ""}
                        onChange={(e) =>
                          updateGuestAttrs(guest.id, { ageGroup: e.target.value || null })
                        }
                        aria-label={`Idade de ${guest.name}`}
                        title={guest.ageGroup ? AGE_LABELS[guest.ageGroup] ?? guest.ageGroup : ""}
                      >
                        {AGE_OPTIONS.map((o) => (
                          <option key={o.label} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        defaultValue={guest.gender ?? ""}
                        placeholder="—"
                        style={{ width: 80 }}
                        aria-label={`Género de ${guest.name}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          if (v !== (guest.gender ?? null)) updateGuestAttrs(guest.id, { gender: v });
                        }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        defaultValue={guest.dietary ?? ""}
                        placeholder="—"
                        style={{ width: 140 }}
                        aria-label={`Dieta de ${guest.name}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          if (v !== (guest.dietary ?? null))
                            updateGuestAttrs(guest.id, { dietary: v });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
