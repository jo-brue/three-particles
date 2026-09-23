import { useEffect } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import TopBar from './components/TopBar';
import EmitterZone from './components/EmitterZone';
import StackPanel from './components/StackPanel';
import Inspector from './components/Inspector';
import Viewport from './components/Viewport';
import { useEditorStore } from './state/store';
import { ModifierSlot } from '~/ParticleSystem/config/configTypes';

function listForSlot(config: ReturnType<typeof useEditorStore.getState>['config'], slot: ModifierSlot) {
  if (slot === 'spawn') return config.spawnModifiers;
  if (slot === 'update') return config.updateModifiers;
  if (slot === 'render') return config.renderModifiers;
  return [];
}

export default function App() {
  const config = useEditorStore((s) => s.config);
  const reorderModifier = useEditorStore((s) => s.reorderModifier);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Clicking anywhere that isn't a modifier item, the inspector, or an interactive control
  // (which may itself change the selection, e.g. picking a new emitter type) clears the
  // current selection - lets clicking empty viewport/panel space deselect.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.stack-item, .inspector, .add-modifier-menu, input, select, textarea, button, label, a')) return;
      useEditorStore.getState().select(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeData = active.data.current as any;
    if (activeData?.kind !== 'stack-item') return;

    const slot: ModifierSlot = activeData.slot;
    const list = listForSlot(config, slot);
    const fromIndex = list.findIndex((m) => m.id === active.id);
    const toIndex = list.findIndex((m) => m.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    reorderModifier(slot, fromIndex, toIndex);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="app-shell">
        <TopBar />
        <div className="app-body">
          <Viewport />
          <div className="right-column">
            <div className="stack-column">
              <EmitterZone />
              <StackPanel slot="spawn" title="Spawn Modifiers" items={config.spawnModifiers} />
              <StackPanel slot="update" title="Update Modifiers" items={config.updateModifiers} />
              <StackPanel slot="render" title="Render Modifiers" items={config.renderModifiers} />
            </div>
            <Inspector />
          </div>
        </div>
      </div>
    </DndContext>
  );
}
