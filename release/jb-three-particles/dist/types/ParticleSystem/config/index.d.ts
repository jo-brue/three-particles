import { BuildOptions, BuiltSystem } from './buildParticleSystem';
import { ParticleView, ViewTargets } from './view';
export * from './configTypes';
export * from './buildParticleSystem';
export { validateConfig } from './validateConfig';
export * from './view';
export { getPluginSpec, ALL_PLUGINS } from './registry';
export type { PluginSpec } from './registry';
export interface LoadOptions extends BuildOptions, ViewTargets {
}
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
export declare function loadParticleSystem(json: unknown, options?: LoadOptions): LoadedSystem;
/** Fetches a particle-editor JSON export from `url` and builds it - see loadParticleSystem. */
export declare function fetchParticleSystem(url: string, options?: LoadOptions): Promise<LoadedSystem>;
