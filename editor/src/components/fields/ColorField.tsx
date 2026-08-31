interface ColorFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="field field-color">
      {label && <label>{label}</label>}
      <div className="field-color-row">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
