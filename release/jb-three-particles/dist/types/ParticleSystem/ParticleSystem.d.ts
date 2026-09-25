import { BufferAttribute, BufferGeometry, Color, Material, Mesh, ShaderMaterialParameters, Texture, Uniform, Vector2Like, Vector3Like, WebGLRenderer } from 'three';
import { default as ParticleDataTexture } from './ParticleDataTexture';
export type ParticleSystemSize = 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024;
export type ParticleRenderMode = 'billboard' | 'instanced';
export type Uniforms = {
    [key: string]: Uniform;
};
export type ParticleAttribute = [string, BufferAttribute];
export type ParticleExtensions = 'pillow' | 'voronoi' | 'PI' | 'curl' | 'randv2' | 'noise3d';
export type ParticleProp<T extends (number | Vector3Like | Vector2Like | Texture | Color)> = Uniform<T> | T;
export type ParticlePlugin = {
    fragVars?: string;
    fragFunc?: string;
    vertVars?: string;
    vertFunc?: string;
    uniforms: Uniforms;
    requires: ParticleExtensions[];
    metaData?: ParticleDataTexture;
};
export type ParticleEmitterPlugin = ParticlePlugin & {
    emitter: ParticleDataTexture;
    preheat?: number[];
    rotation?: ParticleDataTexture;
    emitterFragFunc: string;
    size: ParticleSystemSize;
};
export type ParticleEmitterModifierPlugin = ParticlePlugin & {
    modifierFragFunc: string;
};
export type ParticleSystemProps = {
    emitter: ParticleEmitterPlugin;
    baseSize: number;
    autoUpdate?: boolean;
    materialProps?: ShaderMaterialParameters;
    renderOrder?: number;
    renderMode?: ParticleRenderMode;
    matcapTexture?: Texture;
    instancedMaterial?: Material;
    instancedMesh?: BufferGeometry;
};
export default class ParticleSystem extends Mesh {
    private _renderTargets;
    private _scene;
    private _geometry;
    private _material;
    private _shaderUniforms?;
    private readonly _size;
    private readonly _renderMode;
    visible: boolean;
    private _time;
    private _lastFrameTimestamp;
    constructor(props: ParticleSystemProps, pluginsSpawn?: ParticleEmitterModifierPlugin[], pluginsUpdate?: ParticlePlugin[], pluginsRender?: ParticlePlugin[], preHeat?: number);
    private _setupInstancedMaterial;
    private _mergePluginData;
    update(renderer: WebGLRenderer, deltaTime?: number): void;
    dispose(): void;
}
