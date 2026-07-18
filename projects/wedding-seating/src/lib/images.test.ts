import { it, expect } from "vitest";
import { imageUrlFor } from "./images";

it("maps an object path to the Supabase Storage public URL", () => {
  const url = imageUrlFor("fp123/room.png");
  expect(url).toBe(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/floorplans/fp123/room.png`
  );
});

it("passes an already-absolute http(s) URL through unchanged", () => {
  expect(imageUrlFor("https://example.com/foo.png")).toBe("https://example.com/foo.png");
  expect(imageUrlFor("http://example.com/foo.png")).toBe("http://example.com/foo.png");
});

it("strips a legacy data/uploads/ prefix before building the URL", () => {
  const url = imageUrlFor("data/uploads/fp123/room.png");
  expect(url).toBe(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/floorplans/fp123/room.png`
  );
});

it("returns undefined for null/undefined/empty input", () => {
  expect(imageUrlFor(null)).toBeUndefined();
  expect(imageUrlFor(undefined)).toBeUndefined();
  expect(imageUrlFor("")).toBeUndefined();
});
