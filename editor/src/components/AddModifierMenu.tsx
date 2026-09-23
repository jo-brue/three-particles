import { useEffect, useRef, useState } from 'react';
import { ModifierSlot } from '~/ParticleSystem/config/configTypes';
import { pluginsForSlot } from '~/ParticleSystem/config/registry';

export default function AddModifierMenu({
  slot,
  onAdd,
  label = '+ Add',
}: {
  slot: ModifierSlot;
  onAdd: (type: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const plugins = pluginsForSlot(slot);
  const filtered = filter.trim()
    ? plugins.filter((p) => p.label.toLowerCase().includes(filter.trim().toLowerCase()))
    : plugins;

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setFilter('');
  }, [open]);

  return (
    <div className="add-modifier-menu" ref={rootRef}>
      <button type="button" className="btn-add" onClick={() => setOpen((o) => !o)}>
        {label}
      </button>
      {open && (
        <div className="add-modifier-popover">
          {plugins.length > 6 && (
            <input
              autoFocus
              type="text"
              className="add-modifier-filter"
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          )}
          <div className="add-modifier-list">
            {filtered.length === 0 && <div className="add-modifier-empty">No matches</div>}
            {filtered.map((p) => (
              <button
                type="button"
                key={p.name}
                className={`add-modifier-item${p.isFallback ? ' fallback' : ''}`}
                title={p.isFallback ? 'Auto-detected plugin - edit params as raw JSON' : undefined}
                onClick={() => {
                  onAdd(p.name);
                  setOpen(false);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
