import { ModifierSlot, ParamSpec, ParticleSystemSizeOption } from './configTypes';
export interface PluginSpec {
    name: string;
    slot: ModifierSlot;
    label: string;
    params: ParamSpec[];
    fn: (...args: any[]) => any;
    /** rectangle/circle/circles/circlesStatic/line/lines/linesStatic take the system's
     *  particle-grid size as their first positional arg; the loader supplies it automatically
     *  instead of exposing it. */
    injectSystemSize?: boolean;
    /** Best-effort registry entry auto-derived from the function's runtime signature rather
     *  than hand-curated - shown with a generic JSON-args inspector. */
    isFallback?: boolean;
}
export declare const REGISTRY: PluginSpec[];
export declare const FALLBACK_REGISTRY: PluginSpec[];
export declare const ALL_PLUGINS: PluginSpec[];
export declare function getPluginSpec(name: string): PluginSpec | undefined;
export declare function pluginsForSlot(slot: ModifierSlot): PluginSpec[];
export declare const EMITTER_SIZE_OPTIONS: ParticleSystemSizeOption[];
