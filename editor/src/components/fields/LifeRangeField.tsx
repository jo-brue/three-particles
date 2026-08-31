import NumberField from './NumberField';

interface LifeRangeFieldProps {
  label?: string;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export default function LifeRangeField({ label, value, onChange }: LifeRangeFieldProps) {
  return (
    <div className="field field-lifeRange">
      {label && <label>{label}</label>}
      <div className="field-vector-row">
        <NumberField label="Min" value={value[0]} min={0} max={10} step={0.05} onChange={(min) => onChange([min, value[1]])} />
        <NumberField label="Max" value={value[1]} min={0} max={10} step={0.05} onChange={(max) => onChange([value[0], max])} />
      </div>
    </div>
  );
}
