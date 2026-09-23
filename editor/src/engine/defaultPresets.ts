import defaultPresetFiles from 'virtual:default-presets';
import { ParticleSystemConfig } from '~/ParticleSystem/config/configTypes';
import { validateConfig } from '~/ParticleSystem/config/validateConfig';

/** *.json filenames found in public/assets/defaults at build/dev-server time - see the
 *  `default-presets` Vite plugin in vite.config.ts. */
export const DEFAULT_PRESET_FILES: string[] = defaultPresetFiles;

export function defaultPresetLabel(file: string): string {
  return file.replace(/\.json$/i, '');
}

export async function loadDefaultPreset(file: string): Promise<ParticleSystemConfig> {
  const url = `${import.meta.env.BASE_URL}assets/defaults/${encodeURIComponent(file)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch "${file}" (${res.status})`);
  return validateConfig(await res.json());
}
