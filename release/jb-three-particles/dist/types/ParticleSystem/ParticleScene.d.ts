import { DataTexture, Scene, WebGLRenderer } from 'three';
import { default as ParticleRenderTargets } from './ParticleRenderTargets';
import { ParticlePlugin } from './ParticleSystem';
export default class ParticleScene extends Scene {
    private _updateMaterial;
    private _camera;
    private _geometry;
    private _initialized;
    constructor(tex: DataTexture, rotationTex: DataTexture, preHeat?: number, metaTex?: DataTexture, plugins?: ParticlePlugin[], preheat?: number[]);
    private _initRenderTargets;
    update(renderer: WebGLRenderer, renderTargets: ParticleRenderTargets, time: number, deltaTime: number): void;
    dispose(): void;
}
