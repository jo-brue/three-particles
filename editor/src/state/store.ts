import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  LIVE_KINDS,
  makeInstanceId,
  ModifierInstance,
  ModifierSlot,
  ParamKind,
  ParticleSystemConfig,
} from '../engine/configTypes';
import { createDefaultConfig } from '../engine/defaultConfig';
import { getPluginSpec } from '../engine/registry';
import { applyLiveCircleCenterUpdate, applyLiveLineCenterUpdate, applyLiveUpdate, BuiltSystem } from '../engine/buildParticleSystem';
import { resilientLocalStorage } from './resilientLocalStorage';

export interface Selection {
  slot: ModifierSlot;
  id: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

const DEFAULT_CAMERA_STATE: CameraState = { position: [4, 3, 6], target: [0, 0, 0] };

interface EditorState {
  config: ParticleSystemConfig;
  selected: Selection | null;
  /** Bumped whenever a change can't be pushed live into existing uniforms (add/remove/
   *  reorder/enable-toggle/structural param) - the viewport rebuilds the ParticleSystem
   *  when this changes. Left untouched for live-tweakable numeric/vector/color/gradient
   *  param edits, which are pushed straight into the live THREE.Uniform instead. */
  structureVersion: number;
  /** Set by the viewport after each rebuild; used to push live param updates without
   *  going through React's render cycle. */
  builtSystemRef: { current: BuiltSystem | null };
  buildError: string | null;
  setBuildError: (error: string | null) => void;

  /** Orbit camera position/target - persisted so the viewport reopens where you left it. */
  cameraState: CameraState;
  setCameraState: (cameraState: CameraState) => void;

  /** Viewport chrome (orientation gizmo, grid, axes) - an editor display preference, not part
   *  of the particle system itself, so it lives alongside cameraState rather than in `config`
   *  (and isn't included in JSON export/import). */
  showGizmos: boolean;
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
      builtSystemRef: { current: null },
      buildError: null,
      setBuildError: (buildError) => set({ buildError }),

      cameraState: DEFAULT_CAMERA_STATE,
      setCameraState: (cameraState) => set({ cameraState }),

      showGizmos: true,
      setShowGizmos: (showGizmos) => set({ showGizmos }),

      transparentScreenshot: false,
      setTransparentScreenshot: (transparentScreenshot) => set({ transparentScreenshot }),
      screenshotRef: { current: null },

      setConfig: (config) => set({ config, structureVersion: get().structureVersion + 1, selected: null }),

      resetToDefault: () => set({ config: createDefaultConfig(), structureVersion: get().structureVersion + 1, selected: null }),

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
      // Only config + camera + viewport chrome are worth surviving a reload - selection/build
      // state are transient, and builtSystemRef holds live (non-serializable) THREE objects.
      partialize: (state) => ({
        config: state.config,
        cameraState: state.cameraState,
        showGizmos: state.showGizmos,
        transparentScreenshot: state.transparentScreenshot,
      }),
      // Backfills fields added after a config/camera state was already saved (e.g. blendMode,
      // cameraState itself), so older localStorage entries don't load with `undefined` settings.
      merge: (persisted, current) => {
        const p = persisted as Partial<EditorState> | undefined;
        return {
          ...current,
          config: p?.config ? { ...current.config, ...p.config, system: { ...current.config.system, ...p.config.system } } : current.config,
          cameraState: p?.cameraState ? { ...current.cameraState, ...p.cameraState } : current.cameraState,
          showGizmos: p?.showGizmos ?? current.showGizmos,
          transparentScreenshot: p?.transparentScreenshot ?? current.transparentScreenshot,
        };
      },
    },
  ),
);
