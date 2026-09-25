import { DataTexture, Texture, Color, Uniform, Matrix4, Vector2Like, Vector3Like } from 'three';
import { ParticlePlugin, ParticleEmitterPlugin, ParticleEmitterModifierPlugin, ParticleExtensions, ParticleSystemSize, Uniforms } from './ParticleSystem';
import { default as ParticleDataTexture } from './ParticleDataTexture';
export declare function defaultRotations(size: ParticleSystemSize): ParticleDataTexture;
export declare function create1DGradientDataTexture(stops: [number, string][], size?: number, name?: string): DataTexture;
export declare function create3DGradientDataTexture(stops: [number, Vector3Like][], size?: number, name?: string): DataTexture;
export declare function mergePluginData(plugins: (ParticlePlugin | ParticleEmitterPlugin | ParticleEmitterModifierPlugin)[]): {
    uniforms: {};
    fragVars: string;
    fragFuncs: string;
    emitterFragFuncs: string;
    modifierFragFuncs: string;
    vertVars: string;
    vertFuncs: string;
    requirements: { [key in ParticleExtensions]: string; };
};
/**
 *
 * @param prop
 * @param uniforms
 * @param name
 * @param id
 * @param type
 * @param convertFunc
 * @returns [ propUniformVarString, propVarString ]
 */
export declare function handleProp<T extends (number | Vector3Like | Vector2Like | Texture | Color)>(prop: Uniform<T> | T, uniforms: Uniforms, name: string, id: string, type: 'float' | 'vec3' | 'vec2' | 'sampler2D', convertFunc?: (val: T) => string): [string, string];
export declare function handleUniformProp<T extends (Matrix4 | Texture | Color)>(prop: Uniform<T>, uniforms: Uniforms, name: string, id: string, type: 'sampler2D' | 'mat4' | 'vec4' | 'vec3'): string[];
