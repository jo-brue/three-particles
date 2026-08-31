type Vec3 = { x: number; y: number; z: number };
type Stop = [number, Vec3];

interface GradientVec3FieldProps {
  label?: string;
  value: { stops: Stop[] };
  onChange: (value: { stops: Stop[] }) => void;
}

export default function GradientVec3Field({ label, value, onChange }: GradientVec3FieldProps) {
  const stops = value.stops;

  const updateStop = (index: number, next: Stop) => {
    const copy = [...stops];
    copy[index] = next;
    onChange({ stops: copy });
  };

  const removeStop = (index: number) => onChange({ stops: stops.filter((_, i) => i !== index) });
  const addStop = () => onChange({ stops: [...stops, [0.5, { x: 0, y: 0, z: 0 }]] });

  return (
    <div className="field field-gradient-vec3">
      {label && <label>{label}</label>}
      <div className="gradient-stops">
        {stops.map((stop, i) => (
          <div className="gradient-stop-row gradient-stop-row-vec3" key={i}>
            <input
              type="range" min={0} max={1} step={0.01} value={stop[0]} title="position"
              onChange={(e) => updateStop(i, [parseFloat(e.target.value), stop[1]])}
            />
            {(['x', 'y', 'z'] as const).map((axis) => (
              <input
                key={axis}
                type="number" step={0.1} value={stop[1][axis]} className="field-number-input"
                onChange={(e) => updateStop(i, [stop[0], { ...stop[1], [axis]: parseFloat(e.target.value) || 0 }])}
              />
            ))}
            <button type="button" className="icon-btn" onClick={() => removeStop(i)}>×</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary" onClick={addStop}>+ Add stop</button>
    </div>
  );
}
