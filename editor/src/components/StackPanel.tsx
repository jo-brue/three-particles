import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ModifierInstance, ModifierSlot } from '../engine/configTypes';
import { getPluginSpec } from '../engine/registry';
import { useEditorStore } from '../state/store';
import AddModifierMenu from './AddModifierMenu';

function StackItem({ slot, instance }: { slot: ModifierSlot; instance: ModifierInstance }) {
  const spec = getPluginSpec(instance.type);
  const selected = useEditorStore((s) => s.selected);
  const select = useEditorStore((s) => s.select);
  const toggleEnabled = useEditorStore((s) => s.toggleEnabled);
  const removeModifier = useEditorStore((s) => s.removeModifier);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instance.id,
    data: { kind: 'stack-item', slot },
  });

  const isSelected = selected?.slot === slot && selected.id === instance.id;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`stack-item${isSelected ? ' selected' : ''}${isDragging ? ' dragging' : ''}${instance.enabled ? '' : ' disabled'}`}
      onClick={() => select({ slot, id: instance.id })}
    >
      <span className="stack-item-handle" {...attributes} {...listeners}>⠿</span>
      <input
        type="checkbox" checked={instance.enabled} onClick={(e) => e.stopPropagation()}
        onChange={() => toggleEnabled(slot, instance.id)}
      />
      <span className="stack-item-label">{spec?.label ?? instance.type}</span>
      <button type="button" className="icon-btn" onClick={(e) => { e.stopPropagation(); removeModifier(slot, instance.id); }}>×</button>
    </div>
  );
}

export default function StackPanel({ slot, title, items }: { slot: ModifierSlot; title: string; items: ModifierInstance[] }) {
  const addModifier = useEditorStore((s) => s.addModifier);

  return (
    <div className="stack-panel">
      <div className="stack-panel-title">{title}</div>
      <div className="stack-panel-body">
        {items.length === 0 && (
          <div className="stack-panel-empty">
            {slot === 'spawn'
              ? 'No spawn modifier yet - without one (e.g. Constant Spawn), particles die once and never respawn'
              : 'No modifiers yet'}
          </div>
        )}
        <SortableContext items={items.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {items.map((instance) => (
            <StackItem key={instance.id} slot={slot} instance={instance} />
          ))}
        </SortableContext>
        <AddModifierMenu slot={slot} onAdd={(type) => addModifier(slot, type)} />
      </div>
    </div>
  );
}
