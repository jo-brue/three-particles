import { useRef } from 'react';
import { useEditorStore } from '../state/store';
import { downloadConfig, readConfigFile } from '../utils/json';
import { EMITTER_SIZE_OPTIONS } from '../engine/registry';
import PresetsControl from './PresetsControl';

export default function TopBar() {
  const config = useEditorStore((s) => s.config);
  const setSystemSetting = useEditorStore((s) => s.setSystemSetting);
  const setConfig = useEditorStore((s) => s.setConfig);
  const resetToDefault = useEditorStore((s) => s.resetToDefault);
  const showGizmos = useEditorStore((s) => s.showGizmos);
  const setShowGizmos = useEditorStore((s) => s.setShowGizmos);
  const transparentScreenshot = useEditorStore((s) => s.transparentScreenshot);
  const setTransparentScreenshot = useEditorStore((s) => s.setTransparentScreenshot);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="topbar">
      <div className="topbar-brand">Particle Editor</div>

      <PresetsControl />

      <label className="topbar-field">
        Size
        <select
          value={config.system.size}
          onChange={(e) => setSystemSetting('size', parseInt(e.target.value, 10) as any)}
        >
          {EMITTER_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}×{s} ({s * s})</option>)}
        </select>
      </label>

      <label className="topbar-field">
        Render
        <select
          value={config.system.renderMode}
          onChange={(e) => setSystemSetting('renderMode', e.target.value as any)}
        >
          <option value="billboard">Billboard</option>
          <option value="instanced">Instanced</option>
        </select>
      </label>

      <label className="topbar-field">
        Base size
        <input
          type="number" min={0} step={1} value={config.system.baseSize}
          onChange={(e) => setSystemSetting('baseSize', parseFloat(e.target.value) || 0)}
        />
      </label>

      <label className="topbar-field" title="Particles are born one after another instead of all at once - this sets how many lifetimes that staggered reveal spreads across on load (1 = spread over one full lifetime).">
        Reveal spread
        <input
          type="number" min={0} max={5} step={0.05} value={config.system.preHeat}
          onChange={(e) => setSystemSetting('preHeat', parseFloat(e.target.value) || 0)}
        />
      </label>

      <label className={`topbar-field${transparentScreenshot ? ' topbar-field-disabled' : ''}`}>
        Background
        <input
          type="color" value={config.system.background} disabled={transparentScreenshot}
          onChange={(e) => setSystemSetting('background', e.target.value)}
        />
      </label>

      <label className="topbar-field">
        Transparent
        <input
          type="checkbox" checked={transparentScreenshot}
          onChange={(e) => setTransparentScreenshot(e.target.checked)}
        />
      </label>

      <label className="topbar-field">
        Gizmos
        <input
          type="checkbox" checked={showGizmos}
          onChange={(e) => setShowGizmos(e.target.checked)}
        />
      </label>

      <label className="topbar-field">
        Blend Mode
        <select
          value={config.system.blendMode}
          onChange={(e) => setSystemSetting('blendMode', e.target.value as any)}
        >
          <option value="normal">Normal</option>
          <option value="additive">Additive</option>
          <option value="multiply">Multiply</option>
          <option value="subtractive">Subtractive</option>
        </select>
      </label>

      <div className="topbar-spacer" />

      <button
        type="button" className="btn-secondary"
        onClick={() => useEditorStore.getState().screenshotRef.current?.()}
      >
        Screenshot
      </button>
      <button type="button" className="btn-secondary" onClick={resetToDefault}>Reset</button>
      <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
      <input
        ref={fileInputRef} type="file" accept="application/json" hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            setConfig(await readConfigFile(file));
          } catch (err) {
            alert(`Could not import config: ${(err as Error).message}`);
          }
        }}
      />
      <button type="button" className="btn-primary" onClick={() => downloadConfig(config)}>Export JSON</button>
    </div>
  );
}
