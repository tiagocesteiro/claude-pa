"use client";

import { useCallback, useReducer } from "react";
import {
  editorReducer,
  initialEditorState,
  type EditorTable,
} from "@/lib/floorplan/editorState";
import type { Point } from "@/lib/floorplan/geometry";

export function useEditorState(floorPlanId: string) {
  const [state, dispatch] = useReducer(editorReducer, undefined, initialEditorState);

  const addTable = useCallback((at: Point) => dispatch({ type: "add-table", at }), []);

  const moveTable = useCallback(
    (id: string, to: Point) => dispatch({ type: "move-table", id, to }),
    []
  );

  const updateTable = useCallback(
    (id: string, patch: Partial<Omit<EditorTable, "id">>) =>
      dispatch({ type: "update-table", id, patch }),
    []
  );

  const deleteTable = useCallback((id: string) => dispatch({ type: "delete-table", id }), []);

  const select = useCallback((id: string | null) => dispatch({ type: "select", id }), []);

  const load = useCallback((tables: EditorTable[]) => dispatch({ type: "load", tables }), []);

  const save = useCallback(async () => {
    const tables = state.tables.map(({ id, ...rest }) => {
      void id;
      return rest;
    });
    const res = await fetch(`/api/floorplans/${floorPlanId}/tables`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables }),
    });
    if (!res.ok) throw new Error("failed to save layout");
    const getRes = await fetch(`/api/floorplans/${floorPlanId}/tables`);
    const saved = (await getRes.json()) as EditorTable[];
    dispatch({ type: "load", tables: saved });
    return saved;
  }, [state.tables, floorPlanId]);

  return { state, addTable, moveTable, updateTable, deleteTable, select, load, save };
}
