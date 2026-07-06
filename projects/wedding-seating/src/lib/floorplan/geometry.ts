export interface Point {
  x: number;
  y: number;
}

export function pixelDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function scaleFromReference(a: Point, b: Point, realMetres: number): number {
  if (realMetres <= 0) throw new Error("realMetres must be > 0");
  const px = pixelDistance(a, b);
  if (px === 0) throw new Error("reference points must not coincide");
  return px / realMetres;
}

export function metresToPixels(m: number, scale: number): number {
  return m * scale;
}

export function pixelsToMetres(px: number, scale: number): number {
  return px / scale;
}
