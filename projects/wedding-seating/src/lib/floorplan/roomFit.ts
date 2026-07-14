/**
 * Plan 18 Task 7: derive a floor plan's pixels-per-metre scale for a "blank room"
 * (no uploaded photo) created from typed dimensions, so the room fits the editor
 * canvas the same way an uploaded image's natural pixel size would. The longer of
 * the two sides maps to `targetPx` natural pixels; the shorter side follows the
 * room's real aspect ratio.
 *
 * Returns 0 (the floor plan's existing "uncalibrated" convention — see
 * `tableRenderSize`/`FloorPlanCanvas`) when either dimension isn't a positive,
 * finite number.
 */
export function fitRoomScale(widthM: number, depthM: number, targetPx = 900): number {
  if (!(widthM > 0) || !(depthM > 0) || !(targetPx > 0)) return 0;
  const longer = Math.max(widthM, depthM);
  return targetPx / longer;
}
