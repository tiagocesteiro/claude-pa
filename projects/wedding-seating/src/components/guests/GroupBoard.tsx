"use client";

import { useState } from "react";
import type { Group, Guest } from "./useGuestBoard";
import GuestGroupsEditor from "./GuestGroupsEditor";

const UNGROUPED = "__ungrouped__";

export default function GroupBoard({
  guests,
  groups,
  error,
  assign,
  addGroup,
  renameGroup,
  removeGroup,
  setGuestGroups,
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
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await addGroup(newGroupName.trim());
    setNewGroupName("");
  }

  function startRename(group: Group) {
    setRenamingId(group.id);
    setRenameValue(group.name);
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

  function handleDragStart(e: React.DragEvent, guestId: string) {
    e.dataTransfer.setData("id", guestId);
  }

  function handleDrop(e: React.DragEvent, columnGroupId: string | null) {
    e.preventDefault();
    setDragOverCol(null);
    const guestId = e.dataTransfer.getData("id");
    if (guestId) void assign(guestId, columnGroupId);
  }

  const columns: { key: string; groupId: string | null; group: Group | null }[] = [
    { key: UNGROUPED, groupId: null, group: null },
    ...groups.map((g) => ({ key: g.id, groupId: g.id, group: g })),
  ];

  return (
    <div>
      <form onSubmit={handleAddGroup} style={{ marginBottom: 16 }}>
        <label>
          New group:{" "}
          <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
        </label>
        <button type="submit" style={{ marginLeft: 8 }}>
          Add group
        </button>
      </form>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
        {columns.map((col) => {
          const colGuests = guests.filter((g) => g.groupId === col.groupId);
          const isOver = dragOverCol === col.key;
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.key);
              }}
              onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
              onDrop={(e) => handleDrop(e, col.groupId)}
              data-testid={`column-${col.key}`}
              style={{
                minWidth: 220,
                flex: "0 0 220px",
                border: isOver ? "2px dashed #2563eb" : "1px solid #ddd",
                borderRadius: 8,
                padding: 8,
                background: isOver ? "#eff6ff" : "#fafafa",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {col.group ? (
                  renamingId === col.group.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(col.group!.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(col.group!.id);
                      }}
                    />
                  ) : (
                    <strong onClick={() => startRename(col.group!)} style={{ cursor: "pointer" }}>
                      {col.group.name}
                    </strong>
                  )
                ) : (
                  <strong>Sem grupo</strong>
                )}
                {col.group && (
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(col.group!.id)}
                    disabled={removingId !== null}
                    title="Delete group"
                    style={{ fontSize: 12 }}
                  >
                    {removingId === col.group.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                {colGuests.length} guest(s)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {colGuests.map((guest) => (
                  <div
                    key={guest.id}
                    draggable={editingGuestId !== guest.id}
                    onDragStart={(e) => handleDragStart(e, guest.id)}
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: 6,
                      padding: "6px 8px",
                      background: "#fff",
                      cursor: editingGuestId === guest.id ? "default" : "grab",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>{guest.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingGuestId((id) => (id === guest.id ? null : guest.id))
                        }
                        title="Editar grupos do convidado"
                        style={{ fontSize: 11 }}
                      >
                        {editingGuestId === guest.id ? "Fechar" : "Editar grupos"}
                      </button>
                    </div>
                    {editingGuestId === guest.id && (
                      <GuestGroupsEditor
                        guest={guest}
                        groups={groups}
                        setGuestGroups={setGuestGroups}
                        onClose={() => setEditingGuestId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
