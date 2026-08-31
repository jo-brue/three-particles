import NumberField from './NumberField';
import Vector3Field from './Vector3Field';

interface Line { count: number; length: number; center: { x: number; y: number; z: number } }

interface LinesListFieldProps {
  label?: string;
  value: Line[];
  onChange: (value: Line[]) => void;
  onCenterLiveChange?: (index: number, center: { x: number; y: number; z: number }) => void;
}

export default function LinesListField({ label, value, onChange, onCenterLiveChange }: LinesListFieldProps) {
  const update = (index: number, next: Partial<Line>) => {
    const copy = value.map((l, i) => (i === index ? { ...l, ...next } : l));
    onChange(copy);
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, { count: 50, length: 2, center: { x: 0, y: 0, z: 0 } }]);

  return (
    <div className="field field-lines-list">
      {label && <label>{label}</label>}
      {value.map((line, i) => (
        <div className="circle-row" key={i}>
          <div className="circle-row-header">
            <span>Line {i + 1}</span>
            <button type="button" className="icon-btn" onClick={() => remove(i)}>×</button>
          </div>
          <NumberField label="Count (-1 = auto-fill)" value={line.count} min={-1} max={2000} step={1} onChange={(count) => update(i, { count })} />
          <NumberField label="Length" value={line.length} min={0} max={20} step={0.05} onChange={(length) => update(i, { length })} />
          <Vector3Field
            label="Center"
            value={line.center}
            onChange={(center) => {
              // When centers are Uniform-backed (lines(), not linesStatic()), push the live
              // uniform update instead of a full param replace, so dragging doesn't trigger a
              // shader rebuild on every tick.
              if (onCenterLiveChange) onCenterLiveChange(i, center);
              else update(i, { center });
            }}
          />
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={add}>+ Add line</button>
    </div>
  );
}
