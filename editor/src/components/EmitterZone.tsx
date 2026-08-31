import { getPluginSpec } from '../engine/registry';
import { useEditorStore } from '../state/store';
import AddModifierMenu from './AddModifierMenu';

export default function EmitterZone() {
  const emitter = useEditorStore((s) => s.config.emitter);
  const selected = useEditorStore((s) => s.selected);
  const select = useEditorStore((s) => s.select);
  const setEmitterType = useEditorStore((s) => s.setEmitterType);
  const spec = getPluginSpec(emitter.type);
  const isSelected = selected?.slot === 'emitter';

  return (
    <div className="stack-panel">
      <div className="stack-panel-title">Emitter</div>
      <div className="stack-panel-body emitter-zone">
        <div
          className={`stack-item emitter-item${isSelected ? ' selected' : ''}`}
          onClick={() => select({ slot: 'emitter', id: emitter.id })}
        >
          <span className="stack-item-label">{spec?.label ?? emitter.type}</span>
        </div>
        <AddModifierMenu slot="emitter" label="Change" onAdd={setEmitterType} />
      </div>
    </div>
  );
}
