"use client";

export interface UnassignedGuest {
  id: string;
  name: string;
}

export interface UnassignedTrayProps {
  guests: UnassignedGuest[];
  /** Called when a guest card is dropped onto the tray (assigns them back to no table). */
  onDrop: (guestId: string) => void;
}

export default function UnassignedTray({ guests, onDrop }: UnassignedTrayProps) {
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
            onDragStart={(e) => e.dataTransfer.setData("guestId", g.id)}
            style={{
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: "6px 8px",
              cursor: "grab",
              background: "#fff",
            }}
          >
            {g.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
