import { DataTexture, IUniform, ShaderMaterial, Texture, Vector2Like } from 'three';
import { ParticlePlugin } from './ParticleSystem';
export default class ParticleUpdateMaterial extends ShaderMaterial {
    uniforms: {
        uDeltaTime: IUniform<number>;
        uTime: IUniform<number>;
        stateTexture: IUniform<Texture>;
        metaTexture: IUniform<Texture>;
        rotationTexture: IUniform<Texture>;
        stateTextureDefault: IUniform<Texture>;
        uResolution: IUniform<Vector2Like>;
    };
    name: string;
    private _ownedTextures;
    readonly maxLife: number;
    constructor(tex: DataTexture, rotationTex: DataTexture, preHeat?: number, metaTex?: DataTexture, plugins?: ParticlePlugin[], preheat?: number[]);
    dispose(): void;
}
