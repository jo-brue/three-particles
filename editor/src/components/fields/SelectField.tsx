interface SelectFieldProps {
  label?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export default function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="field field-select">
      {label && <label>{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
