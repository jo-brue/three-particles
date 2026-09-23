import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  CameraState,
  LIVE_KINDS,
  makeInstanceId,
  ModifierInstance,
  ModifierSlot,
  ParamKind,
  ParticleSystemConfig,
} from '~/ParticleSystem/config/configTypes';
import { createDefaultConfig } from '../engine/defaultConfig';
import { getPluginSpec } from '~/ParticleSystem/config/registry';
import { applyLiveCircleCenterUpdate, applyLiveLineCenterUpdate, applyLiveUpdate, BuiltSystem } from '~/ParticleSystem/config/buildParticleSystem';
import { resilientLocalStorage } from './resilientLocalStorage';

export interface Selection {
  slot: ModifierSlot;
  id: string;
}

interface EditorState {
  config: ParticleSystemConfig;
  selected: Selection | null;
  /** Bumped whenever a change can't be pushed live into existing uniforms (add/remove/
   *  reorder/enable-toggle/structural param) - the viewport rebuilds the ParticleSystem
   *  when this changes. Left untouched for live-tweakable numeric/vector/color/gradient
   *  param edits, which are pushed straight into the live THREE.Uniform instead. */
  structureVersion: number;
  /** Bumped only when the whole config is replaced wholesale (import, preset load, reset) -
   *  unlike structureVersion this does NOT bump on ordinary edits, so the viewport can use it
   *  to snap the camera to the loaded config's saved position without yanking it back on
   *  every param tweak. */
  configVersion: number;
  /** Set by the viewport after each rebuild; used to push live param updates without
   *  going through React's render cycle. */
  builtSystemRef: { current: BuiltSystem | null };
  buildError: string | null;
  setBuildError: (error: string | null) => void;

  /** Orbit camera position/target - part of `config` so it round-trips through JSON export/
   *  import and saved presets (loading a preset restores the view it was authored from). */
  setCameraState: (cameraState: CameraState) => void;

  /** Viewport grid/axes helpers - also part of `config` (see above) since some setups read
   *  better with them off. */
  setShowGizmos: (showGizmos: boolean) => void;

  /** Whether a screenshot should omit the scene background (alpha 0) instead of the configured
   *  color - a capture-time option, not a live viewport display mode, so the on-screen canvas
   *  keeps showing the real background while you work. */
  transparentScreenshot: boolean;
  setTransparentScreenshot: (transparentScreenshot: boolean) => void;
  /** Set by the viewport once the renderer exists; TopBar calls this to trigger a capture
   *  without needing a prop/context bridge down into the react-three-fiber tree. */
  screenshotRef: { current: (() => void) | null };

  setConfig: (config: ParticleSystemConfig) => void;
  resetToDefault: () => void;
  select: (selection: Selection | null) => void;
  renameSystem: (name: string) => void;
  setSystemSetting: <K extends keyof ParticleSystemConfig['system']>(key: K, value: ParticleSystemConfig['system'][K]) => void;

  setEmitterType: (type: string) => void;
  addModifier: (slot: ModifierSlot, type: string) => void;
  removeModifier: (slot: ModifierSlot, id: string) => void;
  reorderModifier: (slot: ModifierSlot, fromIndex: number, toIndex: number) => void;
  toggleEnabled: (slot: ModifierSlot, id: string) => void;

  setParam: (slot: ModifierSlot, id: string, paramName: string, kind: ParamKind, value: unknown) => void;
  setCircleCenter: (slot: ModifierSlot, id: string, paramName: string, index: number, center: { x: number; y: number; z: number }) => void;
  setLineCenter: (slot: ModifierSlot, id: string, paramName: string, index: number, center: { x: number; y: number; z: number }) => void;
}

function listForSlot(config: ParticleSystemConfig, slot: ModifierSlot): ModifierInstance[] | null {
  if (slot === 'spawn') return config.spawnModifiers;
  if (slot === 'update') return config.updateModifiers;
  if (slot === 'render') return config.renderModifiers;
  return null; // emitter is a single instance, not a list
}

function withSlotList(config: ParticleSystemConfig, slot: ModifierSlot, list: ModifierInstance[]): ParticleSystemConfig {
  if (slot === 'spawn') return { ...config, spawnModifiers: list };
  if (slot === 'update') return { ...config, updateModifiers: list };
  if (slot === 'render') return { ...config, renderModifiers: list };
  return config;
}

function defaultParamsFor(type: string): Record<string, unknown> {
  const spec = getPluginSpec(type);
  if (!spec) return {};
  const params: Record<string, unknown> = {};
  for (const p of spec.params) params[p.name] = structuredClone(p.default);
  return params;
}

const STORAGE_KEY = 'particle-editor-config';

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      config: createDefaultConfig(),
      selected: null,
      structureVersion: 0,
      configVersion: 0,
      builtSystemRef: { current: null },
      buildError: null,
      setBuildError: (buildError) => set({ buildError }),

      // Neither touches structureVersion (no rebuild needed) nor configVersion (this is an
      // incidental save-as-you-go, not a whole-config load the viewport should snap to).
      setCameraState: (cameraState) => set((s) => ({ config: { ...s.config, camera: cameraState } })),
      setShowGizmos: (showGizmos) => set((s) => ({ config: { ...s.config, showGizmos } })),

      transparentScreenshot: false,
      setTransparentScreenshot: (transparentScreenshot) => set({ transparentScreenshot }),
      screenshotRef: { current: null },

      setConfig: (config) => set((s) => ({
        config, structureVersion: s.structureVersion + 1, configVersion: s.configVersion + 1, selected: null,
      })),

      resetToDefault: () => set((s) => ({
        config: createDefaultConfig(), structureVersion: s.structureVersion + 1, configVersion: s.configVersion + 1, selected: null,
      })),

      select: (selected) => set({ selected }),

      renameSystem: (name) => set((s) => ({ config: { ...s.config, name } })),

      setSystemSetting: (key, value) => set((s) => ({
        config: { ...s.config, system: { ...s.config.system, [key]: value } },
        structureVersion: s.structureVersion + 1,
      })),

      setEmitterType: (type) => set((s) => ({
        config: {
          ...s.config,
          emitter: { id: makeInstanceId(), type, enabled: true, params: defaultParamsFor(type) },
        },
        structureVersion: s.structureVersion + 1,
        selected: { slot: 'emitter', id: s.config.emitter.id },
      })),

      addModifier: (slot, type) => set((s) => {
        if (slot === 'emitter') {
          const id = makeInstanceId();
          return {
            config: { ...s.config, emitter: { id, type, enabled: true, params: defaultParamsFor(type) } },
            structureVersion: s.structureVersion + 1,
            selected: { slot, id },
          };
        }
        const list = listForSlot(s.config, slot)!;
        const instance: ModifierInstance = { id: makeInstanceId(), type, enabled: true, params: defaultParamsFor(type) };
        return {
          config: withSlotList(s.config, slot, [...list, instance]),
          structureVersion: s.structureVersion + 1,
          selected: { slot, id: instance.id },
        };
      }),

      removeModifier: (slot, id) => set((s) => {
        if (slot === 'emitter') return {};
        const list = listForSlot(s.config, slot)!;
        return {
          config: withSlotList(s.config, slot, list.filter((m) => m.id !== id)),
          structureVersion: s.structureVersion + 1,
          selected: s.selected?.id === id ? null : s.selected,
        };
      }),

      reorderModifier: (slot, fromIndex, toIndex) => set((s) => {
        if (slot === 'emitter') return {};
        const list = [...listForSlot(s.config, slot)!];
        const [moved] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, moved);
        return {
          config: withSlotList(s.config, slot, list),
          structureVersion: s.structureVersion + 1,
        };
      }),

      toggleEnabled: (slot, id) => set((s) => {
        if (slot === 'emitter') return {};
        const list = listForSlot(s.config, slot)!.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m));
        return {
          config: withSlotList(s.config, slot, list),
          structureVersion: s.structureVersion + 1,
        };
      }),

      setParam: (slot, id, paramName, kind, value) => {
        set((s) => {
          const updateInstance = (m: ModifierInstance): ModifierInstance =>
            (m.id === id ? { ...m, params: { ...m.params, [paramName]: value } } : m);

          if (slot === 'emitter') {
            return { config: { ...s.config, emitter: updateInstance(s.config.emitter) } };
          }
          const list = listForSlot(s.config, slot)!.map(updateInstance);
          return { config: withSlotList(s.config, slot, list) };
        });

        const live = LIVE_KINDS.has(kind);
        const built = get().builtSystemRef.current;
        const applied = live && built ? applyLiveUpdate(built.uniforms, id, paramName, kind, value) : false;

        if (!applied) {
          set((s) => ({ structureVersion: s.structureVersion + 1 }));
        }
      },

      setCircleCenter: (slot, id, paramName, index, center) => {
        set((s) => {
          const updateInstance = (m: ModifierInstance): ModifierInstance => {
            if (m.id !== id) return m;
            const circles = [...(m.params[paramName] as { count: number; radius: number; center: { x: number; y: number; z: number } }[])];
            circles[index] = { ...circles[index], center };
            return { ...m, params: { ...m.params, [paramName]: circles } };
          };
          if (slot === 'emitter') return { config: { ...s.config, emitter: updateInstance(s.config.emitter) } };
          const list = listForSlot(s.config, slot)!.map(updateInstance);
          return { config: withSlotList(s.config, slot, list) };
        });

        const built = get().builtSystemRef.current;
        const applied = built ? applyLiveCircleCenterUpdate(built.uniforms, id, paramName, index, center) : false;
        if (!applied) {
          set((s) => ({ structureVersion: s.structureVersion + 1 }));
        }
      },

      setLineCenter: (slot, id, paramName, index, center) => {
        set((s) => {
          const updateInstance = (m: ModifierInstance): ModifierInstance => {
            if (m.id !== id) return m;
            const lines = [...(m.params[paramName] as { count: number; length: number; center: { x: number; y: number; z: number } }[])];
            lines[index] = { ...lines[index], center };
            return { ...m, params: { ...m.params, [paramName]: lines } };
          };
          if (slot === 'emitter') return { config: { ...s.config, emitter: updateInstance(s.config.emitter) } };
          const list = listForSlot(s.config, slot)!.map(updateInstance);
          return { config: withSlotList(s.config, slot, list) };
        });

        const built = get().builtSystemRef.current;
        const applied = built ? applyLiveLineCenterUpdate(built.uniforms, id, paramName, index, center) : false;
        if (!applied) {
          set((s) => ({ structureVersion: s.structureVersion + 1 }));
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => resilientLocalStorage),
      // Only config + viewport chrome are worth surviving a reload - selection/build state are
      // transient, and builtSystemRef holds live (non-serializable) THREE objects. Camera/
      // gizmos live inside config now (see configTypes.ts) so they're covered here too.
      partialize: (state) => ({
        config: state.config,
        transparentScreenshot: state.transparentScreenshot,
      }),
      // Backfills fields added after a config was already saved (e.g. blendMode, camera/
      // showGizmos moving from their own top-level keys into config), so older localStorage
      // entries don't load with `undefined` settings.
      merge: (persisted, current) => {
        const p = persisted as (Partial<EditorState> & { cameraState?: CameraState; showGizmos?: boolean }) | undefined;
        return {
          ...current,
          config: p?.config ? {
            ...current.config,
            ...p.config,
            system: { ...current.config.system, ...p.config.system },
            camera: p.config.camera
              ? { ...current.config.camera, ...p.config.camera }
              : p.cameraState ? { ...current.config.camera, ...p.cameraState } : current.config.camera,
            showGizmos: p.config.showGizmos ?? p.showGizmos ?? current.config.showGizmos,
          } : current.config,
          transparentScreenshot: p?.transparentScreenshot ?? current.transparentScreenshot,
        };
      },
    },
  ),
);
