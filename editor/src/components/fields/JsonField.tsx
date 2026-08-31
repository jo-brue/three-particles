import { useEffect, useState } from 'react';

interface JsonFieldProps {
  label?: string;
  value: unknown;
  onChange: (value: unknown) => void;
}

export default function JsonField({ label, value, onChange }: JsonFieldProps) {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 0));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value ?? null, null, 0));
  }, [value]);

  return (
    <div className="field field-json">
      {label && <label>{label} <span className="hint">(auto-detected param, raw JSON)</span></label>}
      <input
        type="text"
        className={error ? 'field-json-input error' : 'field-json-input'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          try {
            onChange(JSON.parse(text));
            setError(null);
          } catch {
            setError('Invalid JSON');
          }
        }}
      />
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
