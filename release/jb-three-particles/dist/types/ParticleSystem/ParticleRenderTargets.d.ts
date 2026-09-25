import { WebGLRenderTarget } from 'three';
import { default as ParticleSource } from './ParticleSource';
import { ParticleSystemSize } from './ParticleSystem';
export default class ParticleRenderTargets extends ParticleSource<WebGLRenderTarget> {
    constructor(size: ParticleSystemSize, hasMeta?: 0 | 1);
    dispose(): void;
}
