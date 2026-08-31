import { IDENTITY_TRS, Trs } from '../../engine/textureBuilders';
import Vector3Field from './Vector3Field';

interface Matrix4FieldProps {
  label?: string;
  value: Trs;
  onChange: (value: Trs) => void;
  /** When true, `value` may be null (matrix4plain "transform?" params) and gets an enable toggle. */
  optional?: boolean;
  rawValue?: Trs | null;
  onChangeRaw?: (value: Trs | null) => void;
}

export default function Matrix4Field({ label, value, onChange, optional, rawValue, onChangeRaw }: Matrix4FieldProps) {
  if (optional) {
    const enabled = rawValue != null;
    return (
      <div className="field field-matrix4">
        <label className="field-bool">
          <input
            type="checkbox" checked={enabled}
            onChange={(e) => onChangeRaw?.(e.target.checked ? IDENTITY_TRS : null)}
          />
          {label}
        </label>
        {enabled && <Matrix4FieldBody value={rawValue ?? IDENTITY_TRS} onChange={(v) => onChangeRaw?.(v)} />}
      </div>
    );
  }

  return (
    <div className="field field-matrix4">
      {label && <label>{label}</label>}
      <Matrix4FieldBody value={value} onChange={onChange} />
    </div>
  );
}

function Matrix4FieldBody({ value, onChange }: { value: Trs; onChange: (v: Trs) => void }) {
  return (
    <div className="matrix4-body">
      <Vector3Field label="Position" value={value.position} onChange={(position) => onChange({ ...value, position })} />
      <Vector3Field label="Rotation °" value={value.rotation} min={-180} max={180} step={1} onChange={(rotation) => onChange({ ...value, rotation })} />
      <Vector3Field label="Scale" value={value.scale} min={0} max={10} step={0.01} onChange={(scale) => onChange({ ...value, scale })} />
    </div>
  );
}
