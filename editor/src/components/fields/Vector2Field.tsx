import NumberField from './NumberField';

interface Vec2 { x: number; y: number }

interface Vector2FieldProps {
  label?: string;
  value: Vec2;
  onChange: (value: Vec2) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function Vector2Field({ label, value, onChange, min = -10, max = 10, step = 0.01 }: Vector2FieldProps) {
  return (
    <div className="field field-vector2">
      {label && <label>{label}</label>}
      <div className="field-vector-row">
        <NumberField label="X" value={value.x} min={min} max={max} step={step} onChange={(x) => onChange({ ...value, x })} />
        <NumberField label="Y" value={value.y} min={min} max={max} step={step} onChange={(y) => onChange({ ...value, y })} />
      </div>
    </div>
  );
}
