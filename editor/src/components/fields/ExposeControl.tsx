import { defaultExposedName } from '~/ParticleSystem/config/configTypes';

interface ExposeControlProps {
  instanceId: string;
  paramName: string;
  /** Public name, or undefined when the param isn't exposed. */
  name: string | undefined;
  duplicate: boolean;
  onChange: (name: string | null) => void;
}

/** "Expose" toggle + public name for a live param. Unexposed params get baked into the shader
 *  as constants when the config is loaded outside the editor. */
export default function ExposeControl({ instanceId, paramName, name, duplicate, onChange }: ExposeControlProps) {
  const exposed = name !== undefined;
  const fallback = defaultExposedName(instanceId, paramName);

  return (
    <div className="expose-control">
      <label className="expose-toggle" title="Make this param a uniform you can change from code at runtime">
        <input
          type="checkbox"
          checked={exposed}
          onChange={(e) => onChange(e.target.checked ? fallback : null)}
        />
        Expose
      </label>
      {exposed && (
        <input
          type="text"
          className={`expose-name${duplicate ? ' error' : ''}`}
          value={name}
          placeholder={fallback}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {exposed && duplicate && <span className="field-error">Name already used</span>}
    </div>
  );
}
