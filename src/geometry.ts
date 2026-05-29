/** Pure geometry helpers for the dynamic diagram. No DOM — unit-tested. */

export interface Pt {
  x: number;
  y: number;
}

export function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Polygon area via the shoelace formula (orientation-independent). */
export function polygonArea(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** Interior angle at `vertex` between rays to `a` and `b`, in degrees [0,180]. */
export function angleDeg(vertex: Pt, a: Pt, b: Pt): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 === 0 || m2 === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y) / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Format a coordinate-space length as a real-unit label, or "" if hidden. */
export function formatLength(
  distCoord: number,
  unitScale: number,
  unit: string,
): string {
  if (!(unitScale > 0)) return "";
  return `${round1(distCoord * unitScale)}${unit}`;
}

/** Format a coordinate-space area as a real-unit² label, or "" if hidden. */
export function formatArea(
  areaCoord: number,
  unitScale: number,
  unit: string,
): string {
  if (!(unitScale > 0)) return "";
  const value = round1(areaCoord * unitScale * unitScale);
  return unit ? `${value} ${unit}²` : `${value}`;
}
