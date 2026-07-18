import { it, expect, afterAll } from "vitest";
import { saveUploadedImage } from "./upload";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase/server";

const testFloorPlanId = "fp123_test_upload";

it("uploads bytes to Supabase Storage and returns the object path", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]); // PNG magic
  const objectPath = await saveUploadedImage(testFloorPlanId, "room.png", bytes);
  expect(objectPath).toBe(`${testFloorPlanId}/room.png`);

  const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).download(objectPath);
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  const uploaded = new Uint8Array(await data!.arrayBuffer());
  expect(Array.from(uploaded)).toEqual(Array.from(bytes));
});

it("sanitizes unsafe filename characters", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const objectPath = await saveUploadedImage(testFloorPlanId, "my room #1 (final).png", bytes);
  expect(objectPath).toBe(`${testFloorPlanId}/my_room__1__final_.png`);
});

afterAll(async () => {
  const { data } = await supabaseAdmin.storage.from(STORAGE_BUCKET).list(testFloorPlanId);
  const names = (data ?? []).map((f) => `${testFloorPlanId}/${f.name}`);
  if (names.length) await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(names);
});
