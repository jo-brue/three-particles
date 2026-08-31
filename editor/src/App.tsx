import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import TopBar from './components/TopBar';
import EmitterZone from './components/EmitterZone';
import StackPanel from './components/StackPanel';
import Inspector from './components/Inspector';
import Viewport from './components/Viewport';
import { useEditorStore } from './state/store';
import { ModifierSlot } from './engine/configTypes';

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
