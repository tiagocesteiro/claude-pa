"use client";

export interface UnassignedGuest {
  id: string;
  name: string;
  locked: boolean;
}

export interface UnassignedTrayProps {
  guests: UnassignedGuest[];
  /** Called when a guest card is dropped onto the tray's empty area (assigns them back to no table). */
  onDrop: (guestId: string) => void;
  /** Called when a guest chip's lock button is toggled. */
  onToggleGuestLock: (guestId: string, locked: boolean) => void;
  /** Called when a guest is dropped directly onto another guest's chip here — exchanges their tables. */
  onSwap: (guestAId: string, guestBId: string) => void;
}

export default function UnassignedTray({ guests, onDrop, onToggleGuestLock, onSwap }: UnassignedTrayProps) {
  return (
    <div
      data-testid="unassigned-tray"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const guestId = e.dataTransfer.getData("guestId");
        if (guestId) onDrop(guestId);
      }}
      style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
    >
      <h3 style={{ marginTop: 0 }}>Por atribuir ({guests.length})</h3>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {guests.length === 0 && (
          <li style={{ fontSize: 13, color: "#666" }}>Sem convidados por atribuir.</li>
        )}
        {guests.map((g) => (
          <li
            key={g.id}
            draggable
            data-testid={`guest-chip-${g.id}`}
            onDragStart={(e) => e.dataTransfer.setData("guestId", g.id)}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const draggedId = e.dataTransfer.getData("guestId");
              if (draggedId && draggedId !== g.id) onSwap(draggedId, g.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              border: g.locked ? "2px solid #b45309" : "1px solid #ccc",
              borderRadius: 6,
              padding: "6px 8px",
              cursor: "grab",
              background: g.locked ? "#fffbeb" : "#fff",
            }}
          >
            <span>{g.name}</span>
            <button
              type="button"
              data-testid={`lock-guest-${g.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleGuestLock(g.id, !g.locked);
              }}
              title={g.locked ? "Desbloquear convidado" : "Bloquear convidado (ignorado pelo Generate)"}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 13,
                padding: 0,
                lineHeight: 1,
              }}
            >
              {g.locked ? "🔒" : "🔓"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
