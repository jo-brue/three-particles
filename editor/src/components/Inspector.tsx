import { useEditorStore } from '../state/store';
import { getPluginSpec } from '~/ParticleSystem/config/registry';
import { exposedName, LIVE_KINDS, ModifierInstance } from '~/ParticleSystem/config/configTypes';
import { collectExposedParams, findDuplicateExposedNames } from '~/ParticleSystem/config/buildParticleSystem';
import NumberField from './fields/NumberField';
import Vector3Field from './fields/Vector3Field';
import Vector2Field from './fields/Vector2Field';
import ColorField from './fields/ColorField';
import BoolField from './fields/BoolField';
import LifeRangeField from './fields/LifeRangeField';
import GradientColorField from './fields/GradientColorField';
import GradientScalarField from './fields/GradientScalarField';
import GradientVec3Field from './fields/GradientVec3Field';
import TextureField from './fields/TextureField';
import Matrix4Field from './fields/Matrix4Field';
import CirclesListField from './fields/CirclesListField';
import LinesListField from './fields/LinesListField';
import SelectField from './fields/SelectField';
import JsonField from './fields/JsonField';
import ExposeControl from './fields/ExposeControl';

export default function Inspector() {
  const selected = useEditorStore((s) => s.selected);
  const config = useEditorStore((s) => s.config);
  const setParam = useEditorStore((s) => s.setParam);
  const setCircleCenter = useEditorStore((s) => s.setCircleCenter);
  const setLineCenter = useEditorStore((s) => s.setLineCenter);
  const removeModifier = useEditorStore((s) => s.removeModifier);
  const toggleEnabled = useEditorStore((s) => s.toggleEnabled);
  const setExposed = useEditorStore((s) => s.setExposed);

  if (!selected) {
    return <div className="inspector inspector-empty">Select a modifier to edit its parameters.</div>;
  }

  const instance: ModifierInstance | undefined = selected.slot === 'emitter'
    ? config.emitter
    : (selected.slot === 'spawn' ? config.spawnModifiers
      : selected.slot === 'update' ? config.updateModifiers : config.renderModifiers
    ).find((m) => m.id === selected.id);

  if (!instance) return <div className="inspector inspector-empty">Nothing selected.</div>;

  const spec = getPluginSpec(instance.type);
  if (!spec) return <div className="inspector inspector-empty">Unknown plugin "{instance.type}".</div>;

  const duplicateNames = findDuplicateExposedNames(collectExposedParams(config));

  return (
    <div className="inspector">
      <div className="inspector-header">
        <div>
          <div className="inspector-title">{spec.label}</div>
          <div className="inspector-subtitle">{selected.slot} · {spec.name}</div>
        </div>
        <div className="inspector-actions">
          {selected.slot !== 'emitter' && (
            <>
              <BoolField label="Enabled" value={instance.enabled} onChange={() => toggleEnabled(selected.slot, instance.id)} />
              <button type="button" className="btn-danger" onClick={() => removeModifier(selected.slot, instance.id)}>Remove</button>
            </>
          )}
        </div>
      </div>

      {spec.isFallback && (
        <div className="inspector-fallback-note">
          This modifier isn't curated with typed controls yet - edit its raw arguments as JSON below.
        </div>
      )}

      {spec.params.length === 0 && <div className="inspector-empty-params">No parameters.</div>}

      <div className="inspector-params">
        {spec.params.map((paramSpec) => {
          const value = instance.params[paramSpec.name] ?? paramSpec.default;
          const onChange = (v: unknown) => setParam(selected.slot, instance.id, paramSpec.name, paramSpec.kind, v);

          const field = (() => { switch (paramSpec.kind) {
            case 'float':
              return <NumberField key={paramSpec.name} label={paramSpec.label} value={value as number} min={paramSpec.min} max={paramSpec.max} step={paramSpec.step} onChange={onChange} />;
            case 'plainFloat':
              return <NumberField key={paramSpec.name} label={paramSpec.label} value={value as number} min={paramSpec.min} max={paramSpec.max} step={paramSpec.step} onChange={onChange} />;
            case 'vec3':
            case 'plainVec3':
              return <Vector3Field key={paramSpec.name} label={paramSpec.label} value={value as any} onChange={onChange} />;
            case 'vec2':
              return <Vector2Field key={paramSpec.name} label={paramSpec.label} value={value as any} onChange={onChange} />;
            case 'color':
              return <ColorField key={paramSpec.name} label={paramSpec.label} value={value as string} onChange={onChange} />;
            case 'plainBool':
              return <BoolField key={paramSpec.name} label={paramSpec.label} value={value as boolean} onChange={onChange} />;
            case 'lifeRange':
              return <LifeRangeField key={paramSpec.name} label={paramSpec.label} value={value as [number, number]} onChange={onChange} />;
            case 'gradientColor':
              return <GradientColorField key={paramSpec.name} label={paramSpec.label} value={value as any} onChange={onChange} />;
            case 'gradientScalar':
              return <GradientScalarField key={paramSpec.name} label={paramSpec.label} value={value as any} onChange={onChange} />;
            case 'gradientVec3':
              return <GradientVec3Field key={paramSpec.name} label={paramSpec.label} value={value as any} onChange={onChange} />;
            case 'texture':
              return <TextureField key={paramSpec.name} label={paramSpec.label} value={value as any} onChange={onChange} />;
            case 'matrix4':
              return <Matrix4Field key={paramSpec.name} label={paramSpec.label} value={value as any} onChange={onChange} />;
            case 'matrix4plain':
              return (
                <Matrix4Field
                  key={paramSpec.name} label={paramSpec.label} optional
                  value={value as any} onChange={onChange}
                  rawValue={value as any} onChangeRaw={onChange}
                />
              );
            case 'circlesList':
              return (
                <CirclesListField
                  key={paramSpec.name} label={paramSpec.label} value={value as any} onChange={onChange}
                  onCenterLiveChange={paramSpec.circlesCenterLive
                    ? (index, center) => setCircleCenter(selected.slot, instance.id, paramSpec.name, index, center)
                    : undefined}
                />
              );
            case 'linesList':
              return (
                <LinesListField
                  key={paramSpec.name} label={paramSpec.label} value={value as any} onChange={onChange}
                  onCenterLiveChange={paramSpec.linesCenterLive
                    ? (index, center) => setLineCenter(selected.slot, instance.id, paramSpec.name, index, center)
                    : undefined}
                />
              );
            case 'select':
              return <SelectField key={paramSpec.name} label={paramSpec.label} value={value as string} options={paramSpec.options ?? []} onChange={onChange} />;
            case 'json':
            default:
              return <JsonField key={paramSpec.name} label={paramSpec.label} value={value} onChange={onChange} />;
          } })();

          if (!LIVE_KINDS.has(paramSpec.kind)) return field;
          const name = exposedName(instance, paramSpec.name);
          return (
            <div key={paramSpec.name} className={`param-block${name !== null ? ' exposed' : ''}`}>
              {field}
              <ExposeControl
                instanceId={instance.id}
                paramName={paramSpec.name}
                name={instance.exposed?.[paramSpec.name]}
                duplicate={name !== null && instance.enabled && duplicateNames.has(name)}
                onChange={(n) => setExposed(selected.slot, instance.id, paramSpec.name, n)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
