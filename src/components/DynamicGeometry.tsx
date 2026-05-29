import { useMemo, useRef, useState } from "react";
import type { DiagramSpec } from "../api";
import {
  angleDeg,
  distance,
  formatArea,
  formatLength,
  polygonArea,
  type Pt,
} from "../geometry";

interface Props {
  spec: DiagramSpec;
}

const PAD = 16;

/**
 * GeoGebra-style interactive figure. Students drag the highlighted vertices and
 * watch lengths, area, and angles update live. All measurements are computed
 * from the current point positions (see ../geometry) — the model only supplies
 * geometry data, never code.
 */
export default function DynamicGeometry({ spec }: Props) {
  const initial = useMemo(() => {
    const m: Record<string, Pt> = {};
    for (const p of spec.points) m[p.id] = { x: p.x, y: p.y };
    return m;
  }, [spec]);

  const [pos, setPos] = useState<Record<string, Pt>>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const get = (id: string): Pt => pos[id] ?? { x: 0, y: 0 };

  function toUser(e: React.PointerEvent): Pt | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const sp = svg.createSVGPoint();
    sp.x = e.clientX;
    sp.y = e.clientY;
    const loc = sp.matrixTransform(ctm.inverse());
    return { x: loc.x, y: loc.y };
  }

  function onPointerDown(id: string, draggable: boolean) {
    return (e: React.PointerEvent) => {
      if (!draggable) return;
      e.preventDefault();
      setDragId(id);
      svgRef.current?.setPointerCapture(e.pointerId);
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragId) return;
    const u = toUser(e);
    if (!u) return;
    const x = Math.max(PAD, Math.min(spec.width - PAD, u.x));
    const y = Math.max(PAD, Math.min(spec.height - PAD, u.y));
    setPos((prev) => ({ ...prev, [dragId]: { x, y } }));
  }

  function endDrag(e: React.PointerEvent) {
    if (dragId) svgRef.current?.releasePointerCapture(e.pointerId);
    setDragId(null);
  }

  const { unit, unitScale } = spec;

  return (
    <div className="dynamic-geo">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${spec.width} ${spec.height}`}
        className="geo-svg"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* polygons (fill) */}
        {spec.polygons.map((poly, i) => {
          const pts = poly.points.map(get);
          const d = pts.map((p) => `${p.x},${p.y}`).join(" ");
          const area = polygonArea(pts);
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          const label = poly.showArea ? formatArea(area, unitScale, unit) : "";
          return (
            <g key={`poly-${i}`}>
              <polygon points={d} className="geo-polygon" />
              {label && (
                <text x={cx} y={cy} className="geo-area-label" textAnchor="middle">
                  {label}
                </text>
              )}
            </g>
          );
        })}

        {/* circles */}
        {spec.circles.map((c, i) => {
          const center = get(c.center);
          const r = c.throughPoint ? distance(center, get(c.throughPoint)) : 0;
          if (r <= 0) return null;
          return (
            <g key={`circle-${i}`}>
              <circle cx={center.x} cy={center.y} r={r} className="geo-circle" />
              {c.showRadius && c.throughPoint && (
                <>
                  <line
                    x1={center.x}
                    y1={center.y}
                    x2={get(c.throughPoint).x}
                    y2={get(c.throughPoint).y}
                    className="geo-segment"
                  />
                  <text
                    x={(center.x + get(c.throughPoint).x) / 2}
                    y={(center.y + get(c.throughPoint).y) / 2 - 6}
                    className="geo-length-label"
                    textAnchor="middle"
                  >
                    r={formatLength(r, unitScale, unit)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* segments */}
        {spec.segments.map((s, i) => {
          const a = get(s.from);
          const b = get(s.to);
          const label = s.showLength
            ? formatLength(distance(a, b), unitScale, unit)
            : "";
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          // perpendicular offset so the label sits beside the line
          const len = distance(a, b) || 1;
          const ox = (-(b.y - a.y) / len) * 12;
          const oy = ((b.x - a.x) / len) * 12;
          return (
            <g key={`seg-${i}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="geo-segment" />
              {label && (
                <text
                  x={mx + ox}
                  y={my + oy}
                  className="geo-length-label"
                  textAnchor="middle"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}

        {/* angles */}
        {spec.angles.map((ang, i) => {
          const v = get(ang.vertex);
          const a = get(ang.from);
          const b = get(ang.to);
          const deg = angleDeg(v, a, b);
          const node = <AngleMark key={`ang-${i}`} v={v} a={a} b={b} right={ang.right} />;
          return (
            <g key={`anggrp-${i}`}>
              {node}
              {ang.showDegrees && (
                <text x={v.x} y={v.y - 14} className="geo-angle-label" textAnchor="middle">
                  {Math.round(deg)}°
                </text>
              )}
            </g>
          );
        })}

        {/* points */}
        {spec.points.map((p) => {
          const cur = get(p.id);
          return (
            <g key={p.id}>
              <circle
                cx={cur.x}
                cy={cur.y}
                r={p.draggable ? 9 : 5}
                className={p.draggable ? "geo-point draggable" : "geo-point"}
                onPointerDown={onPointerDown(p.id, p.draggable)}
                style={{ cursor: p.draggable ? "grab" : "default" }}
              />
              {p.label && (
                <text x={cur.x + 11} y={cur.y - 9} className="geo-point-label">
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="geo-toolbar">
        <span className="muted">💡 拖动蓝色的点,数值会跟着一起变</span>
        <div className="spacer" />
        <button className="btn-ghost" onClick={() => setPos(initial)}>
          复位
        </button>
      </div>
    </div>
  );
}

/** Angle arc marker (or a right-angle square when `right`). */
function AngleMark({ v, a, b, right }: { v: Pt; a: Pt; b: Pt; right: boolean }) {
  const norm = (p: Pt) => {
    const m = Math.hypot(p.x, p.y) || 1;
    return { x: p.x / m, y: p.y / m };
  };
  const d1 = norm({ x: a.x - v.x, y: a.y - v.y });
  const d2 = norm({ x: b.x - v.x, y: b.y - v.y });
  const deg = angleDeg(v, a, b);

  if (right && Math.abs(deg - 90) < 8) {
    const s = 14;
    const p1 = { x: v.x + d1.x * s, y: v.y + d1.y * s };
    const p2 = { x: v.x + d1.x * s + d2.x * s, y: v.y + d1.y * s + d2.y * s };
    const p3 = { x: v.x + d2.x * s, y: v.y + d2.y * s };
    return (
      <polyline
        points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
        className="geo-angle-mark"
      />
    );
  }

  const r = 20;
  const p1 = { x: v.x + d1.x * r, y: v.y + d1.y * r };
  const p2 = { x: v.x + d2.x * r, y: v.y + d2.y * r };
  const cross = d1.x * d2.y - d1.y * d2.x;
  const sweep = cross > 0 ? 1 : 0;
  return (
    <path
      d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 ${sweep} ${p2.x} ${p2.y}`}
      className="geo-angle-mark"
    />
  );
}
