import { buildParticleSystem, BuildOptions, BuiltSystem } from '~/ParticleSystem/config/buildParticleSystem';
import { applyView, ParticleView, resolveView, ViewTargets } from '~/ParticleSystem/config/view';
import { validateConfig } from '~/ParticleSystem/config/validateConfig';

export * from '~/ParticleSystem/config/configTypes';
export * from '~/ParticleSystem/config/buildParticleSystem';
export { validateConfig } from '~/ParticleSystem/config/validateConfig';
export * from '~/ParticleSystem/config/view';
export { getPluginSpec, ALL_PLUGINS } from '~/ParticleSystem/config/registry';
export type { PluginSpec } from '~/ParticleSystem/config/registry';

export interface LoadOptions extends BuildOptions, ViewTargets {}

export interface LoadedSystem extends BuiltSystem {
  /** The camera/background/renderer settings from the config - already applied to whatever
   *  you passed in `scene`/`camera`/`renderer`. */
  view: ParticleView;
}

/** Builds a ParticleSystem from a particle-editor JSON export - either the parsed object or the
 *  raw JSON string. Pass your `scene`, `camera` and `renderer` to have the setup placed and
 *  framed exactly like in the editor (each is optional - see ViewTargets); `visible` then
 *  defaults to true. Returns the system, its exposed params, the resolved `view` settings, and a
 *  dispose() that removes it from the scene and frees the textures the loader created. */
export function loadParticleSystem(json: unknown, options: LoadOptions = {}): LoadedSystem {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  const config = validateConfig(parsed);
  const { scene, camera, renderer, transparent, ...buildOptions } = options;

  const built = buildParticleSystem(config, { ...buildOptions, visible: buildOptions.visible ?? !!scene });
  const view = resolveView(config, transparent);
  applyView(view, { scene, camera, renderer });
  scene?.add(built.system);

  return {
    ...built,
    view,
    dispose: () => {
      scene?.remove(built.system);
      built.dispose();
    },
  };
}

/** Fetches a particle-editor JSON export from `url` and builds it - see loadParticleSystem. */
export async function fetchParticleSystem(url: string, options?: LoadOptions): Promise<LoadedSystem> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch particle system config "${url}" (${res.status})`);
  return loadParticleSystem(await res.json(), options);
}
