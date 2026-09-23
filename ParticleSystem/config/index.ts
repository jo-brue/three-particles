import { buildParticleSystem, BuildOptions, BuiltSystem } from '~/ParticleSystem/config/buildParticleSystem';
import { validateConfig } from '~/ParticleSystem/config/validateConfig';

export * from '~/ParticleSystem/config/configTypes';
export * from '~/ParticleSystem/config/buildParticleSystem';
export { validateConfig } from '~/ParticleSystem/config/validateConfig';
export { getPluginSpec, ALL_PLUGINS } from '~/ParticleSystem/config/registry';
export type { PluginSpec } from '~/ParticleSystem/config/registry';

/** Builds a ParticleSystem from a particle-editor JSON export - either the parsed object or the
 *  raw JSON string. Returns the system plus its live uniforms (keyed `${instanceId}:${param}`)
 *  and a dispose() that also frees the gradient/image textures the loader created.
 *  Editor-only fields (camera, showGizmos, system.background) are ignored. */
export function loadParticleSystem(json: unknown, options?: BuildOptions): BuiltSystem {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  return buildParticleSystem(validateConfig(parsed), options);
}

/** Fetches a particle-editor JSON export from `url` and builds it - see loadParticleSystem. */
export async function fetchParticleSystem(url: string, options?: BuildOptions): Promise<BuiltSystem> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch particle system config "${url}" (${res.status})`);
  return loadParticleSystem(await res.json(), options);
}
