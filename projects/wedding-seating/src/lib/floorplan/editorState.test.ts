import { describe, it, expect } from "vitest";
import { editorReducer, initialEditorState, type EditorState } from "./editorState";

const base: EditorState = initialEditorState();

it("adds a table with defaults and marks state dirty", () => {
  const s = editorReducer(base, { type: "add-table", at: { x: 10, y: 20 } });
  expect(s.tables.length).toBe(1);
  expect(s.tables[0]).toMatchObject({ shape: "round", capacity: 8, x: 10, y: 20, fixed: false });
  expect(s.dirty).toBe(true);
});

it("moves a table by id", () => {
  const added = editorReducer(base, { type: "add-table", at: { x: 0, y: 0 } });
  const id = added.tables[0].id;
  const moved = editorReducer(added, { type: "move-table", id, to: { x: 99, y: 88 } });
  expect(moved.tables[0]).toMatchObject({ x: 99, y: 88 });
});

it("updates and deletes a table", () => {
  const added = editorReducer(base, { type: "add-table", at: { x: 0, y: 0 } });
  const id = added.tables[0].id;
  const upd = editorReducer(added, { type: "update-table", id, patch: { capacity: 10, fixed: true } });
  expect(upd.tables[0]).toMatchObject({ capacity: 10, fixed: true });
  const del = editorReducer(upd, { type: "delete-table", id });
  expect(del.tables.length).toBe(0);
});

it("loads a layout and clears dirty", () => {
  const dirty = editorReducer(base, { type: "add-table", at: { x: 1, y: 1 } });
  const loaded = editorReducer(dirty, {
    type: "load",
    tables: [{ id: "t1", shape: "rect", capacity: 6, x: 5, y: 5, fixed: false }],
  });
  expect(loaded.tables.length).toBe(1);
  expect(loaded.dirty).toBe(false);
});
