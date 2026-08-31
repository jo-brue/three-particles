import { useRef, useState, type PointerEvent } from 'react';
import { parseColorAlpha, toRgbaCss } from './colorCss';

type Stop = [number, string];

interface GradientColorFieldProps {
  label?: string;
  value: { stops: Stop[] };
  onChange: (value: { stops: Stop[] }) => void;
}

const clampT = (t: number) => Math.min(1, Math.max(0, t));

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16) || 0,
    g: parseInt(hex.slice(3, 5), 16) || 0,
    b: parseInt(hex.slice(5, 7), 16) || 0,
  };
}

// Interpolates the gradient's own current colors at t, so a stop added by clicking the bar
// starts out matching what's already there instead of popping in as a jarring flat white.
function sampleColorAt(sorted: Stop[], t: number): string {
  if (sorted.length === 0) return 'rgba(255,255,255,1)';
  if (t <= sorted[0][0]) return sorted[0][1];
  if (t >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1];

  for (let i = 0; i < sorted.length - 1; i++) {
    const [ta, ca] = sorted[i];
    const [tb, cb] = sorted[i + 1];
    if (t < ta || t > tb) continue;
    const localT = tb > ta ? (t - ta) / (tb - ta) : 0;
    const a = parseColorAlpha(ca);
    const b = parseColorAlpha(cb);
    const rgbA = hexToRgb(a.hex);
    const rgbB = hexToRgb(b.hex);
    const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * localT);
    const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * localT);
    const bl = Math.round(rgbA.b + (rgbB.b - rgbA.b) * localT);
    const alpha = a.alpha + (b.alpha - a.alpha) * localT;
    return `rgba(${r},${g},${bl},${alpha})`;
  }
  return 'rgba(255,255,255,1)';
}

export default function GradientColorField({ label, value, onChange }: GradientColorFieldProps) {
  const stops = value.stops;
  const sorted = [...stops].sort((a, b) => a[0] - b[0]);
  const previewCss = stops.length
    ? `linear-gradient(90deg, ${sorted.map(([t, c]) => `${c} ${t * 100}%`).join(', ')})`
    : 'none';

  const [selected, setSelected] = useState<number | null>(stops.length ? 0 : null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingIndex = useRef<number | null>(null);

  const updateStop = (index: number, next: Stop) => {
    const copy = [...stops];
    copy[index] = next;
    onChange({ stops: copy });
  };

  const removeStop = (index: number) => {
    onChange({ stops: stops.filter((_, i) => i !== index) });
    setSelected((prev) => {
      if (prev === null || prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  };

  const tFromEvent = (e: { clientX: number }) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return clampT((e.clientX - rect.left) / rect.width);
  };

  const addStopAt = (t: number) => {
    const nextStops: Stop[] = [...stops, [t, sampleColorAt(sorted, t)]];
    onChange({ stops: nextStops });
    setSelected(nextStops.length - 1);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (draggingIndex.current === null) return;
    const index = draggingIndex.current;
    updateStop(index, [tFromEvent(e), stops[index][1]]);
  };

  const stopDragging = () => { draggingIndex.current = null; };

  const selectedStop = selected !== null ? stops[selected] : null;
  const selectedColor = selectedStop ? parseColorAlpha(selectedStop[1]) : null;

  return (
    <div className="field field-gradient">
      {label && <label>{label}</label>}
      <div
        className="gradient-track"
        ref={trackRef}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.gradient-handle')) return;
          addStopAt(tFromEvent(e));
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
      >
        <div className="gradient-track-checker" />
        <div className="gradient-preview" style={{ background: previewCss }} />
        {stops.map((stop, i) => (
          <div
            key={i}
            className={`gradient-handle${i === selected ? ' selected' : ''}`}
            style={{ left: `${stop[0] * 100}%`, background: stop[1] }}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              draggingIndex.current = i;
              setSelected(i);
            }}
            onClick={(e) => e.stopPropagation()}
            title={`t = ${stop[0].toFixed(2)}`}
          />
        ))}
      </div>

      {selectedStop && selectedColor && (
        <div className="gradient-stop-props">
          <input
            type="color" value={selectedColor.hex}
            onChange={(e) => updateStop(selected!, [selectedStop[0], toRgbaCss(e.target.value, selectedColor.alpha)])}
          />
          <input
            type="range" min={0} max={1} step={0.01} value={selectedColor.alpha} title="alpha"
            onChange={(e) => updateStop(selected!, [selectedStop[0], toRgbaCss(selectedColor.hex, parseFloat(e.target.value))])}
          />
          <input
            type="number" min={0} max={1} step={0.01} value={selectedStop[0]} className="field-number-input" title="position"
            onChange={(e) => updateStop(selected!, [clampT(parseFloat(e.target.value) || 0), selectedStop[1]])}
          />
          <button type="button" className="icon-btn" onClick={() => removeStop(selected!)}>×</button>
        </div>
      )}

      <button type="button" className="btn-secondary" onClick={() => addStopAt(0.5)}>+ Add stop</button>
    </div>
  );
}
