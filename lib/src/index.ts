// Public entry of the distributable package - re-exports the engine that lives in
// ../ParticleSystem and ../Helpers.ts (the same sources the editor imports via `~`).

export { default as ParticleSystem } from '~/ParticleSystem/ParticleSystem';
export type {
  ParticleSystemSize,
  ParticleRenderMode,
  Uniforms,
  ParticleAttribute,
  ParticleExtensions,
  ParticleProp,
  ParticlePlugin,
  ParticleEmitterPlugin,
  ParticleEmitterModifierPlugin,
  ParticleSystemProps,
} from '~/ParticleSystem/ParticleSystem';

export * as EmitterPlugins from '~/ParticleSystem/ParticlePluginsEmitter';
export * as UpdatePlugins from '~/ParticleSystem/ParticlePluginsUpdate';
export * as RenderPlugins from '~/ParticleSystem/ParticlePluginsRender';

// Loading particle-editor JSON exports
export * from '~/ParticleSystem/config';

// Building blocks for custom plugins and textures
export { default as GradientTexture } from '~/ParticleSystem/GradientTexture';
export { default as FGALoader } from '~/ParticleSystem/FGALoader';
export * from '~/ParticleSystem/Helpers';
export { Extensions } from '~/ParticleSystem/ParticleSystemExtensions';
export { uResolution, tNoise } from '~/ParticleSystem/uniforms';
export * from '~/Helpers';
