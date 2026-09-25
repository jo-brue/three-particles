import { IUniform, ShaderMaterial, Texture } from 'three';
import { ParticlePlugin, ParticleRenderMode, ParticleSystemProps } from './ParticleSystem';
type uniforms = {
    tStateTexture: IUniform<Texture>;
    tStateTextureDefault: IUniform<Texture>;
    uBaseSize: IUniform<number>;
    uTime: IUniform<number>;
    tMatcap?: IUniform<Texture | null>;
};
export default class ParticleRenderMaterial extends ShaderMaterial {
    uniforms: uniforms;
    name: string;
    private _ownedTextures;
    constructor(props: ParticleSystemProps, plugins?: ParticlePlugin[], renderMode?: ParticleRenderMode);
    dispose(): void;
}
export {};
