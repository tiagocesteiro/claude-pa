"use client";

import { useParams } from "next/navigation";
import { useGuestBoard } from "@/components/guests/useGuestBoard";
import ImportPanel from "@/components/guests/ImportPanel";
import AddGuestForm from "@/components/guests/AddGuestForm";
import GuestTable from "@/components/guests/GuestTable";

export default function WeddingWorkspacePage() {
  const params = useParams<{ id: string }>();
  const weddingId = params.id;

  const {
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
    updateGuestAttrs,
    setPlusOne,
  } = useGuestBoard(weddingId);

  return (
    <div>
      <ImportPanel weddingId={weddingId} onImported={refresh} />

      <AddGuestForm groups={groups} addGuest={addGuest} />

      {loading && guests.length === 0 ? (
        <p>Loading guests...</p>
      ) : (
        <GuestTable
          guests={guests}
          groups={groups}
          error={error}
          assign={assign}
          addGroup={addGroup}
          renameGroup={renameGroup}
          removeGroup={removeGroup}
          setGuestGroups={setGuestGroups}
          updateGuestAttrs={updateGuestAttrs}
          setPlusOne={setPlusOne}
        />
      )}
    </div>
  );
}
