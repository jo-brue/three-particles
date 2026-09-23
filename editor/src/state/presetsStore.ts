import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ParticleSystemConfig } from '~/ParticleSystem/config/configTypes';
import { resilientLocalStorage } from './resilientLocalStorage';

export interface SavedPreset {
  id: string;
  name: string;
  savedAt: number;
  config: ParticleSystemConfig;
}

interface PresetsState {
  presets: SavedPreset[];
  /** Saves a new named preset, cloning the config so later edits to the live config don't
   *  mutate what was saved. */
  savePreset: (name: string, config: ParticleSystemConfig) => SavedPreset;
  /** Overwrites an existing preset's config in place (name/id/original savedAt kept), used
   *  by "Update" to resave over the currently loaded preset. */
  overwritePreset: (id: string, config: ParticleSystemConfig) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
}

// Presets live in their own localStorage entry (distinct from the single "last settings"
// snapshot in store.ts) so an unbounded number of named setups don't get wiped whenever the
// live-editing autosave resets.
const PRESETS_STORAGE_KEY = 'particle-editor-presets';

function makePresetId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const usePresetsStore = create<PresetsState>()(
  persist(
    (set) => ({
      presets: [],

      savePreset: (name, config) => {
        const preset: SavedPreset = { id: makePresetId(), name, savedAt: Date.now(), config: structuredClone(config) };
        set((s) => ({ presets: [...s.presets, preset] }));
        return preset;
      },

      overwritePreset: (id, config) => set((s) => ({
        presets: s.presets.map((p) => (p.id === id ? { ...p, config: structuredClone(config), savedAt: Date.now() } : p)),
      })),

      renamePreset: (id, name) => set((s) => ({
        presets: s.presets.map((p) => (p.id === id ? { ...p, name } : p)),
      })),

      deletePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
    }),
    {
      name: PRESETS_STORAGE_KEY,
      storage: createJSONStorage(() => resilientLocalStorage),
    },
  ),
);
