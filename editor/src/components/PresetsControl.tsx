import { useState } from 'react';
import { useEditorStore } from '../state/store';
import { usePresetsStore } from '../state/presetsStore';

/** Top-left saved-setups cluster. No separate editable "system name" field - that duplicated
 *  the selected preset's name and was confusing. `config.name` still exists under the hood
 *  (Export JSON / screenshot filenames use it) and is kept in sync with whichever preset name
 *  was last loaded or saved, distinct from the single "last settings" snapshot the editor
 *  autosaves on every edit (see store.ts). */
export default function PresetsControl() {
  const config = useEditorStore((s) => s.config);
  const renameSystem = useEditorStore((s) => s.renameSystem);
  const setConfig = useEditorStore((s) => s.setConfig);
  const presets = usePresetsStore((s) => s.presets);
  const savePreset = usePresetsStore((s) => s.savePreset);
  const overwritePreset = usePresetsStore((s) => s.overwritePreset);
  const deletePreset = usePresetsStore((s) => s.deletePreset);
  const [selectedId, setSelectedId] = useState('');

  const selected = presets.find((p) => p.id === selectedId) ?? null;

  const handleLoad = (id: string) => {
    setSelectedId(id);
    const preset = presets.find((p) => p.id === id);
    if (preset) setConfig(preset.config);
  };

  const handleSaveAs = () => {
    const name = prompt('Name this setup:', selected?.name ?? config.name)?.trim();
    if (!name) return;
    renameSystem(name);
    const preset = savePreset(name, { ...config, name });
    setSelectedId(preset.id);
  };

  const handleUpdate = () => {
    if (!selected) return;
    overwritePreset(selected.id, config);
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!confirm(`Delete saved setup "${selected.name}"?`)) return;
    deletePreset(selected.id);
    setSelectedId('');
  };

  return (
    <div className="topbar-presets">
      <select
        className="topbar-presets-select"
        value={selectedId}
        onChange={(e) => handleLoad(e.target.value)}
      >
        <option value="">Saved setups…</option>
        {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button type="button" className="btn-secondary" onClick={handleSaveAs}>Save As</button>
      <button type="button" className="btn-secondary" disabled={!selected} onClick={handleUpdate}>Update</button>
      <button type="button" className="btn-danger" disabled={!selected} onClick={handleDelete}>Delete</button>
    </div>
  );
}
