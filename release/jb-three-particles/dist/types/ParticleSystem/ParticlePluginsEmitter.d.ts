import { Matrix4, Texture, Uniform, Vector2Like, Vector3, Vector3Like } from 'three';
import { ParticleEmitterModifierPlugin, ParticleEmitterPlugin, ParticleProp, ParticleSystemSize } from './ParticleSystem';
export declare function applayMatrix(matrix: Uniform<Matrix4>): ParticleEmitterModifierPlugin;
export declare function curve(curvature: ParticleProp<number>): ParticleEmitterModifierPlugin;
export declare function frame(size: Uniform<number> | number, thickness: Uniform<number> | number): ParticleEmitterModifierPlugin;
export declare function controlTexture(controlTexture: Uniform<Texture>, contrast: Uniform<number> | number): ParticleEmitterModifierPlugin;
export declare function killAreaPillow(size: ParticleProp<number>): ParticleEmitterModifierPlugin;
export declare function killAreaRound(position: ParticleProp<Vector3>, size: ParticleProp<number>, invert?: boolean): ParticleEmitterModifierPlugin;
export declare function killAreaRoundUV(position: ParticleProp<Vector2Like>, size: ParticleProp<number>, invert?: boolean): ParticleEmitterModifierPlugin;
export declare function simpleNoise(noiseTexture: Uniform<Texture>, noiseSpeed: ParticleProp<Vector2Like>, noiseScale: ParticleProp<number>, pixelate: ParticleProp<number>, noiseStrength: ParticleProp<number>, contrast: ParticleProp<number>): ParticleEmitterModifierPlugin;
export declare function simpleNoiseInPlace(noiseTexture: Uniform<Texture>, noiseSpeed: ParticleProp<number>, noiseScale: ParticleProp<number>, pixelate: ParticleProp<number>, noiseStrength: ParticleProp<number>, contrast: ParticleProp<number>): ParticleEmitterModifierPlugin;
export declare function simpleNoise3D(noiseSpeed: ParticleProp<number>, noiseScale: ParticleProp<number>, pixelate: ParticleProp<number>, noiseStrength: ParticleProp<number>, contrast: ParticleProp<number>): ParticleEmitterModifierPlugin;
export declare function heightOffsetNoise(noiseTexture: Uniform<Texture>, noiseSpeed: ParticleProp<number>, noiseScale: ParticleProp<number>, offset: ParticleProp<number>, contrast: ParticleProp<number>): ParticleEmitterModifierPlugin;
export declare function voronoiAreas(noiseSpeed: ParticleProp<number>, noiseScale_1: ParticleProp<number>, noiseScale_2: ParticleProp<number>, contrast: ParticleProp<number>): ParticleEmitterModifierPlugin;
export declare function constantSpawn(): ParticleEmitterModifierPlugin;
export declare function constantSpawnArea(position: ParticleProp<Vector3Like>, size: ParticleProp<number>): ParticleEmitterModifierPlugin;
export declare function rectangle(size: ParticleSystemSize, lifeMinMax?: [number, number], transform?: Matrix4, randomize?: number): ParticleEmitterPlugin;
export declare function limit(size: ParticleProp<number>, center: ParticleProp<Vector3Like>): ParticleEmitterModifierPlugin;
export declare function circles(size: ParticleSystemSize, circles: {
    count: number;
    radius: number | [[number, number], [number, number, number, number]];
    center: ParticleProp<Vector3Like>;
}[], lifeMinMax?: [number, number], transform?: Matrix4, randomize?: number): ParticleEmitterPlugin;
export declare function circlesStatic(size: ParticleSystemSize, circles: {
    count: number;
    radius: number | [[number, number], [number, number, number, number]];
    center: Vector3Like;
}[], lifeMinMax?: [number, number], transform?: Matrix4, randomize?: number): ParticleEmitterPlugin;
export declare function line(size: ParticleSystemSize, length: number, lifeMinMax?: [number, number], transform?: Matrix4, randomize?: number): ParticleEmitterPlugin;
export declare function lines(size: ParticleSystemSize, lines: {
    count: number;
    length: number;
    center: ParticleProp<Vector3Like>;
}[], lifeMinMax?: [number, number], transform?: Matrix4, randomize?: number): ParticleEmitterPlugin;
export declare function linesStatic(size: ParticleSystemSize, lines: {
    count: number;
    length: number;
    center: Vector3Like;
}[], lifeMinMax?: [number, number], transform?: Matrix4, randomize?: number): ParticleEmitterPlugin;
export declare function circle(size: ParticleSystemSize, radius: number, lifeMinMax?: [number, number], transform?: Matrix4, randomize?: number): ParticleEmitterPlugin;
