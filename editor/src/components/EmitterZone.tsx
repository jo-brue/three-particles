import { useState } from 'react';
import { getPluginSpec, EMITTER_SIZE_OPTIONS } from '~/ParticleSystem/config/registry';
import { useEditorStore } from '../state/store';
import AddModifierMenu from './AddModifierMenu';
import PanelHeader from './PanelHeader';

export default function EmitterZone() {
  const emitter = useEditorStore((s) => s.config.emitter);
  const system = useEditorStore((s) => s.config.system);
  const setSystemSetting = useEditorStore((s) => s.setSystemSetting);
  const selected = useEditorStore((s) => s.selected);
  const select = useEditorStore((s) => s.select);
  const setEmitterType = useEditorStore((s) => s.setEmitterType);
  const spec = getPluginSpec(emitter.type);
  const isSelected = selected?.slot === 'emitter';
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="stack-panel">
      <PanelHeader title="Emitter" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      {!collapsed && (
        <div className="stack-panel-body emitter-zone">
          <div className="global-field-row">
            <label className="global-field">
              Size
              <select
                value={system.size}
                onChange={(e) => setSystemSetting('size', parseInt(e.target.value, 10) as any)}
              >
                {EMITTER_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}×{s} ({s * s})</option>)}
              </select>
            </label>

            <label className="global-field">
              Base size
              <input
                type="number" min={0} step={1} value={system.baseSize}
                onChange={(e) => setSystemSetting('baseSize', parseFloat(e.target.value) || 0)}
              />
            </label>
          </div>

          <div
            className={`stack-item emitter-item${isSelected ? ' selected' : ''}`}
            onClick={() => select({ slot: 'emitter', id: emitter.id })}
          >
            <span className="stack-item-label">{spec?.label ?? emitter.type}</span>
          </div>
          <AddModifierMenu slot="emitter" label="Change" onAdd={setEmitterType} />
        </div>
      )}
    </div>
  );
}
