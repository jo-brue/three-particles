import { useState } from 'react';
import { useEditorStore } from '../state/store';
import { usePresetsStore } from '../state/presetsStore';
import { DEFAULT_PRESET_FILES, defaultPresetLabel, loadDefaultPreset } from '../engine/defaultPresets';
import { validateConfig } from '~/ParticleSystem/config/validateConfig';

const DEFAULT_PREFIX = 'default:';
const PRESET_PREFIX = 'preset:';

/** Top-left saved-setups cluster. No separate editable "system name" field - that duplicated
 *  the selected preset's name and was confusing. `config.name` still exists under the hood
 *  (Export JSON / screenshot filenames use it) and is kept in sync with whichever preset name
 *  was last loaded or saved, distinct from the single "last settings" snapshot the editor
 *  autosaves on every edit (see store.ts).
 *
 *  Built-in defaults (public/assets/defaults) and user-saved setups share one dropdown, grouped
 *  into optgroups; the select value is prefixed ("default:"/"preset:") to tell the two apart
 *  since they're keyed differently (filename vs. generated id). Only saved setups can be
 *  updated/deleted. */
export default function PresetsControl() {
  const config = useEditorStore((s) => s.config);
  const renameSystem = useEditorStore((s) => s.renameSystem);
  const setConfig = useEditorStore((s) => s.setConfig);
  const presets = usePresetsStore((s) => s.presets);
  const savePreset = usePresetsStore((s) => s.savePreset);
  const overwritePreset = usePresetsStore((s) => s.overwritePreset);
  const deletePreset = usePresetsStore((s) => s.deletePreset);
  const [selection, setSelection] = useState('');
  const [loadingDefault, setLoadingDefault] = useState(false);

  const selectedPresetId = selection.startsWith(PRESET_PREFIX) ? selection.slice(PRESET_PREFIX.length) : null;
  const selected = presets.find((p) => p.id === selectedPresetId) ?? null;

  const handleSelect = async (value: string) => {
    setSelection(value);
    if (!value) return;

    if (value.startsWith(PRESET_PREFIX)) {
      const preset = presets.find((p) => p.id === value.slice(PRESET_PREFIX.length));
      if (!preset) return;
      try {
        // Re-validated on load (not just at import time) so setups saved before a config field
        // was added (e.g. camera/showGizmos) still get backfilled instead of loading `undefined`.
        setConfig(validateConfig(preset.config));
      } catch (err) {
        alert(`Could not load saved setup: ${(err as Error).message}`);
      }
      return;
    }

    const file = value.slice(DEFAULT_PREFIX.length);
    setLoadingDefault(true);
    try {
      setConfig(await loadDefaultPreset(file));
    } catch (err) {
      alert(`Could not load default preset: ${(err as Error).message}`);
      setSelection('');
    } finally {
      setLoadingDefault(false);
    }
  };

  const handleSaveAs = () => {
    const name = prompt('Name this setup:', selected?.name ?? config.name)?.trim();
    if (!name) return;
    renameSystem(name);
    const preset = savePreset(name, { ...config, name });
    setSelection(`${PRESET_PREFIX}${preset.id}`);
  };

  const handleUpdate = () => {
    if (!selected) return;
    overwritePreset(selected.id, config);
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!confirm(`Delete saved setup "${selected.name}"?`)) return;
    deletePreset(selected.id);
    setSelection('');
  };

  return (
    <div className="topbar-presets">
      <select
        className="topbar-presets-select"
        value={selection}
        disabled={loadingDefault}
        onChange={(e) => handleSelect(e.target.value)}
      >
        <option value="">Setups…</option>
        {DEFAULT_PRESET_FILES.length > 0 && (
          <optgroup label="Defaults">
            {DEFAULT_PRESET_FILES.map((file) => (
              <option key={file} value={`${DEFAULT_PREFIX}${file}`}>{defaultPresetLabel(file)}</option>
            ))}
          </optgroup>
        )}
        {presets.length > 0 && (
          <optgroup label="Saved">
            {presets.map((p) => <option key={p.id} value={`${PRESET_PREFIX}${p.id}`}>{p.name}</option>)}
          </optgroup>
        )}
      </select>
      <button type="button" className="btn-secondary" onClick={handleSaveAs}>Save As</button>
      <button type="button" className="btn-secondary" disabled={!selected} onClick={handleUpdate}>Update</button>
      <button type="button" className="btn-danger" disabled={!selected} onClick={handleDelete}>Delete</button>
    </div>
  );
}
