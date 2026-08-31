interface NumberFieldProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function NumberField({ label, value, onChange, min = -10, max = 10, step = 0.01 }: NumberFieldProps) {
  return (
    <div className="field field-number">
      {label && <label>{label}</label>}
      <div className="field-number-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <input
          type="number"
          className="field-number-input"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
        />
      </div>
    </div>
  );
}
