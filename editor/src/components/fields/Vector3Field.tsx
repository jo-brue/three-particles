import NumberField from './NumberField';

interface Vec3 { x: number; y: number; z: number }

interface Vector3FieldProps {
  label?: string;
  value: Vec3;
  onChange: (value: Vec3) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function Vector3Field({ label, value, onChange, min = -10, max = 10, step = 0.01 }: Vector3FieldProps) {
  return (
    <div className="field field-vector3">
      {label && <label>{label}</label>}
      <div className="field-vector-row">
        <NumberField label="X" value={value.x} min={min} max={max} step={step} onChange={(x) => onChange({ ...value, x })} />
        <NumberField label="Y" value={value.y} min={min} max={max} step={step} onChange={(y) => onChange({ ...value, y })} />
        <NumberField label="Z" value={value.z} min={min} max={max} step={step} onChange={(z) => onChange({ ...value, z })} />
      </div>
    </div>
  );
}
