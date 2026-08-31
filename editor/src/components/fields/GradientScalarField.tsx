import { useRef, useState, type PointerEvent } from 'react';

// [t, v, hiDt, hiDv, hoDt, hoDv] - see textureBuilders.ts's ScalarCurvePoint for the convention.
type Point = [number, number, number, number, number, number];

interface GradientScalarFieldProps {
  label?: string;
  value: { stops: number[][] };
  onChange: (value: { stops: number[][] }) => void;
}

const normalize = (raw: number[]): Point => [raw[0] ?? 0, raw[1] ?? 0, raw[2] ?? 0, raw[3] ?? 0, raw[4] ?? 0, raw[5] ?? 0];
const clampT = (t: number) => Math.min(1, Math.max(0, t));

// Vertical range the editor shows - a bit beyond [0,1] so overshoot/anticipation handles have
// room to be dragged and seen, without needing a dynamic zoom/pan system.
const V_MIN = -0.3;
const V_MAX = 1.3;
const vToPercent = (v: number) => 100 - ((v - V_MIN) / (V_MAX - V_MIN)) * 100;
const percentToV = (p: number) => V_MIN + (1 - p / 100) * (V_MAX - V_MIN);

function bezierPathD(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M 0 ${vToPercent(points[0][1])} L 100 ${vToPercent(points[0][1])}`;
  let d = `M ${points[0][0] * 100} ${vToPercent(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p3 = points[i + 1];
    const p1t = p0[0] + p0[4], p1v = p0[1] + p0[5];
    const p2t = p3[0] + p3[2], p2v = p3[1] + p3[3];
    d += ` C ${p1t * 100} ${vToPercent(p1v)}, ${p2t * 100} ${vToPercent(p2v)}, ${p3[0] * 100} ${vToPercent(p3[1])}`;
  }
  return d;
}

// Interpolates the curve's own current value at t (bisecting each bezier segment's own t(u), the
// same technique buildScalarGradientTexture uses to bake the curve) - so a point added by
// clicking the curve starts out sitting exactly on it instead of popping in at a guessed value.
function sampleAt(points: Point[], t: number): number {
  if (points.length === 0) return 1;
  if (t <= points[0][0]) return points[0][1];
  if (t >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p3 = points[i + 1];
    if (t < p0[0] || t > p3[0]) continue;
    const p1t = p0[0] + p0[4], p2t = p3[0] + p3[2];
    let lo = 0, hi = 1;
    for (let iter = 0; iter < 24; iter++) {
      const mid = (lo + hi) / 2;
      const mt = 1 - mid;
      const x = mt * mt * mt * p0[0] + 3 * mt * mt * mid * p1t + 3 * mt * mid * mid * p2t + mid * mid * mid * p3[0];
      if (x < t) lo = mid; else hi = mid;
    }
    const u = (lo + hi) / 2;
    const mt = 1 - u;
    const p1v = p0[1] + p0[5], p2v = p3[1] + p3[3];
    return mt * mt * mt * p0[1] + 3 * mt * mt * u * p1v + 3 * mt * u * u * p2v + u * u * u * p3[1];
  }
  return points[0][1];
}

type Drag = { type: 'point' | 'hi' | 'ho'; index: number };

export default function GradientScalarField({ label, value, onChange }: GradientScalarFieldProps) {
  const points = value.stops.map(normalize).sort((a, b) => a[0] - b[0]);

  const [selected, setSelected] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);

  // A point with both handles at zero-length is stored as just [t, v] instead of the full
  // 6-tuple - not merely equivalent-looking, but actually corner data (no dead zero handle
  // fields lingering once a point's converted back off bezier). normalize() fills them back in
  // as 0 on the way in, so this round-trips cleanly either way.
  const trimPoint = (p: Point): number[] => (p[2] === 0 && p[3] === 0 && p[4] === 0 && p[5] === 0 ? [p[0], p[1]] : p);
  const commit = (next: Point[]) => onChange({ stops: next.map(trimPoint) });

  const updatePoint = (index: number, next: Point) => {
    commit(points.map((p, i) => (i === index ? next : p)));
  };

  const removePoint = (index: number) => {
    if (index === 0 || index === points.length - 1) return;
    commit(points.filter((_, i) => i !== index));
    setSelected(null);
  };

  const addPointAt = (t: number) => {
    const next: Point = [t, sampleAt(points, t), 0, 0, 0, 0];
    const inserted = [...points, next].sort((a, b) => a[0] - b[0]);
    commit(inserted);
    setSelected(inserted.indexOf(next));
  };

  // Right-click toggles a point between a sharp linear "corner" (all handles zeroed - a
  // degenerate bezier that's exactly a straight line, same as the pre-bezier curve format) and
  // a smooth bezier point (handles auto-computed from its neighbors, mirrored in/out so the
  // curve passes through it smoothly - the standard "smooth point" tangent, scaled to a fixed
  // fraction of each adjacent segment's width and clamped there so it can never cross into the
  // next segment over).
  const HANDLE_T_FRACTION = 0.35;
  const toggleBezier = (index: number) => {
    const p = points[index];
    const hasHandles = p[2] !== 0 || p[3] !== 0 || p[4] !== 0 || p[5] !== 0;

    if (hasHandles) {
      updatePoint(index, [p[0], p[1], 0, 0, 0, 0]);
      return;
    }

    const prev = index > 0 ? points[index - 1] : null;
    const next = index < points.length - 1 ? points[index + 1] : null;

    let slope = 0;
    if (prev && next) {
      const dt = next[0] - prev[0];
      slope = dt > 1e-6 ? (next[1] - prev[1]) / dt : 0;
    } else if (next) {
      const dt = next[0] - p[0];
      slope = dt > 1e-6 ? (next[1] - p[1]) / dt : 0;
    } else if (prev) {
      const dt = p[0] - prev[0];
      slope = dt > 1e-6 ? (p[1] - prev[1]) / dt : 0;
    }

    const hoDt = next ? (next[0] - p[0]) * HANDLE_T_FRACTION : 0;
    const hiDt = prev ? -(p[0] - prev[0]) * HANDLE_T_FRACTION : 0;

    updatePoint(index, [p[0], p[1], hiDt, hiDt * slope, hoDt, hoDt * slope]);
  };

  const posFromEvent = (e: { clientX: number; clientY: number }) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const t = clampT((e.clientX - rect.left) / rect.width);
    const v = percentToV(((e.clientY - rect.top) / rect.height) * 100);
    return { t, v };
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = points[drag.index];
    if (!p) return;
    const { t, v } = posFromEvent(e);

    if (drag.type === 'point') {
      const isEndpoint = drag.index === 0 || drag.index === points.length - 1;
      const prevT = drag.index > 0 ? points[drag.index - 1][0] : 0;
      const nextT = drag.index < points.length - 1 ? points[drag.index + 1][0] : 1;
      const newT = isEndpoint ? p[0] : Math.min(nextT - 0.001, Math.max(prevT + 0.001, t));
      updatePoint(drag.index, [newT, v, p[2], p[3], p[4], p[5]]);
    } else if (drag.type === 'ho') {
      const nextT = drag.index < points.length - 1 ? points[drag.index + 1][0] : 1;
      const dt = Math.min(Math.max(0, nextT - p[0]), Math.max(0, t - p[0]));
      updatePoint(drag.index, [p[0], p[1], p[2], p[3], dt, v - p[1]]);
    } else {
      const prevT = drag.index > 0 ? points[drag.index - 1][0] : 0;
      const dt = Math.max(Math.min(0, prevT - p[0]), Math.min(0, t - p[0]));
      updatePoint(drag.index, [p[0], p[1], dt, v - p[1], p[4], p[5]]);
    }
  };

  const stopDragging = () => { dragRef.current = null; };

  const startDrag = (drag: Drag) => (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = drag;
    setSelected(drag.index);
  };

  const sel = selected !== null ? points[selected] : null;
  // A corner point (right-clicked off bezier, or never given handles) has both offsets at
  // exactly 0 - hide its handle dots entirely rather than rendering them sitting on top of the
  // point itself, where they'd silently intercept drags meant for the point.
  const hasHi = !!sel && selected! > 0 && (sel[2] !== 0 || sel[3] !== 0);
  const hasHo = !!sel && selected! < points.length - 1 && (sel[4] !== 0 || sel[5] !== 0);

  return (
    <div className="field field-curve">
      {label && <label>{label}</label>}
      <div
        className="curve-editor"
        ref={containerRef}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.curve-point, .curve-handle-dot')) return;
          addPointAt(posFromEvent(e).t);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
      >
        <svg className="curve-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1={vToPercent(0)} x2="100" y2={vToPercent(0)} className="curve-gridline" />
          <line x1="0" y1={vToPercent(1)} x2="100" y2={vToPercent(1)} className="curve-gridline" />
          <path d={bezierPathD(points)} className="curve-path" vectorEffect="non-scaling-stroke" />
          {hasHi && (
            <line
              x1={sel![0] * 100} y1={vToPercent(sel![1])}
              x2={(sel![0] + sel![2]) * 100} y2={vToPercent(sel![1] + sel![3])}
              className="curve-handle-line"
            />
          )}
          {hasHo && (
            <line
              x1={sel![0] * 100} y1={vToPercent(sel![1])}
              x2={(sel![0] + sel![4]) * 100} y2={vToPercent(sel![1] + sel![5])}
              className="curve-handle-line"
            />
          )}
        </svg>

        {hasHi && (
          <div
            className="curve-handle-dot"
            style={{ left: `${(sel![0] + sel![2]) * 100}%`, top: `${vToPercent(sel![1] + sel![3])}%` }}
            onPointerDown={startDrag({ type: 'hi', index: selected! })}
            onClick={(e) => e.stopPropagation()}
            title="in handle"
          />
        )}
        {hasHo && (
          <div
            className="curve-handle-dot"
            style={{ left: `${(sel![0] + sel![4]) * 100}%`, top: `${vToPercent(sel![1] + sel![5])}%` }}
            onPointerDown={startDrag({ type: 'ho', index: selected! })}
            onClick={(e) => e.stopPropagation()}
            title="out handle"
          />
        )}

        {points.map((p, i) => (
          <div
            key={i}
            className={`curve-point${i === selected ? ' selected' : ''}`}
            style={{ left: `${p[0] * 100}%`, top: `${vToPercent(p[1])}%` }}
            onPointerDown={startDrag({ type: 'point', index: i })}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => { e.stopPropagation(); removePoint(i); }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelected(i); toggleBezier(i); }}
            title={`t = ${p[0].toFixed(2)}, v = ${p[1].toFixed(2)} (double-click: remove, right-click: toggle bezier)`}
          />
        ))}
      </div>
    </div>
  );
}
