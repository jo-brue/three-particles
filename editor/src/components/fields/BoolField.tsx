interface BoolFieldProps {
  label?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function BoolField({ label, value, onChange }: BoolFieldProps) {
  return (
    <label className="field field-bool">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
