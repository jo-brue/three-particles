import NumberField from './NumberField';
import Vector3Field from './Vector3Field';

interface Circle { count: number; radius: number; center: { x: number; y: number; z: number } }

interface CirclesListFieldProps {
  label?: string;
  value: Circle[];
  onChange: (value: Circle[]) => void;
  onCenterLiveChange?: (index: number, center: { x: number; y: number; z: number }) => void;
}

export default function CirclesListField({ label, value, onChange, onCenterLiveChange }: CirclesListFieldProps) {
  const update = (index: number, next: Partial<Circle>) => {
    const copy = value.map((c, i) => (i === index ? { ...c, ...next } : c));
    onChange(copy);
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, { count: 50, radius: 1, center: { x: 0, y: 0, z: 0 } }]);

  return (
    <div className="field field-circles-list">
      {label && <label>{label}</label>}
      {value.map((circle, i) => (
        <div className="circle-row" key={i}>
          <div className="circle-row-header">
            <span>Ring {i + 1}</span>
            <button type="button" className="icon-btn" onClick={() => remove(i)}>×</button>
          </div>
          <NumberField label="Count (-1 = auto-fill)" value={circle.count} min={-1} max={2000} step={1} onChange={(count) => update(i, { count })} />
          <NumberField label="Radius" value={circle.radius} min={0} max={20} step={0.05} onChange={(radius) => update(i, { radius })} />
          <Vector3Field
            label="Center"
            value={circle.center}
            onChange={(center) => {
              // When centers are Uniform-backed (circles(), not circlesStatic()), push the
              // live uniform update instead of a full param replace, so dragging doesn't
              // trigger a shader rebuild on every tick.
              if (onCenterLiveChange) onCenterLiveChange(i, center);
              else update(i, { center });
            }}
          />
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={add}>+ Add ring</button>
    </div>
  );
}
