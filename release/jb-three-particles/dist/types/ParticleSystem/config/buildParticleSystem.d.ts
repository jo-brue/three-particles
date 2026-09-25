import { Uniform } from 'three';
import { default as ParticleSystemEngine } from '../ParticleSystem';
import { ModifierSlot, ParamKind, ParticleSystemConfig } from './configTypes';
export type UniformKey = string;
export interface ExposedParam {
    name: string;
    slot: ModifierSlot;
    instanceId: string;
    modifierType: string;
    param: string;
    kind: ParamKind;
}
export interface BuiltSystem {
    system: ParticleSystemEngine;
    /** Every Uniform the loader created, keyed `${instanceId}:${paramName}`. */
    uniforms: Map<UniformKey, Uniform<any>>;
    /** The exposed params (see ModifierInstance.exposed) by public name. Mutate `.value` in
     *  place (`params.wind.value.set(1, 0, 0)`), or use setParam() for JSON-style values. */
    params: Record<string, Uniform<any>>;
    exposed: ExposedParam[];
    /** Sets an exposed param from the same JSON-style value the editor saves ({x,y,z}, '#rrggbb',
     *  gradient stops, ...) - rebuilds textures for gradient/texture params. False if `name`
     *  isn't exposed (or its modifier is disabled). */
    setParam: (name: string, value: unknown) => boolean;
    dispose: () => void;
}
/** Every exposed param of every enabled modifier, in stack order. */
export declare function collectExposedParams(config: ParticleSystemConfig): ExposedParam[];
/** Public names used by more than one exposed param. */
export declare function findDuplicateExposedNames(exposed: ExposedParam[]): Set<string>;
export interface BuildOptions {
    /** ParticleSystem defaults to `visible = false` (consumers flip it once ready, e.g. after an
     *  orchestrated fade-in). Pass true to have it on screen immediately. Default: false. */
    visible?: boolean;
    /** Passed straight to the engine - set false to drive `system.update()` yourself. Default: true. */
    autoUpdate?: boolean;
    /** Make every live-capable param a Uniform, not just the exposed ones - the editor needs this
     *  so its controls can push changes without a rebuild. Default: false, i.e. unexposed
     *  float/vec2/vec3/color params are baked into the shader as constants. */
    allLive?: boolean;
}
export declare function buildParticleSystem(config: ParticleSystemConfig, options?: BuildOptions): BuiltSystem;
/** Mutates an existing Uniform's .value in place - no shader recompile. Only valid for
 *  LIVE_KINDS params (see configTypes.ts) whose Uniform is still bound to the currently
 *  compiled shader (i.e. nothing structural changed since the last full build). */
export declare function applyLiveUpdate(uniforms: Map<UniformKey, Uniform<any>>, instanceId: string, paramName: string, kind: ParamKind, value: any): boolean;
export declare function applyLiveCircleCenterUpdate(uniforms: Map<UniformKey, Uniform<any>>, instanceId: string, paramName: string, circleIndex: number, center: {
    x: number;
    y: number;
    z: number;
}): boolean;
export declare function applyLiveLineCenterUpdate(uniforms: Map<UniformKey, Uniform<any>>, instanceId: string, paramName: string, lineIndex: number, center: {
    x: number;
    y: number;
    z: number;
}): boolean;
