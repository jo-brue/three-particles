import { DEFAULT_CAMERA_STATE, ParticleSystemConfig } from '~/ParticleSystem/config/configTypes';

/** Normalizes a parsed particle-editor JSON export into a full ParticleSystemConfig, filling in
 *  defaults for anything missing. Throws if the value isn't a config at all. */
export function validateConfig(value: unknown): ParticleSystemConfig {
  if (!value || typeof value !== 'object') throw new Error('Not a valid particle system config: not an object');
  const v = value as Partial<ParticleSystemConfig>;
  if (!v.system || !v.emitter) throw new Error('Not a valid particle system config: missing "system" or "emitter"');
  return {
    version: 1,
    name: v.name ?? 'Untitled',
    camera: {
      position: v.camera?.position ?? DEFAULT_CAMERA_STATE.position,
      target: v.camera?.target ?? DEFAULT_CAMERA_STATE.target,
    },
    showGizmos: v.showGizmos ?? true,
    system: {
      size: v.system.size ?? 64,
      baseSize: v.system.baseSize ?? 20,
      renderMode: v.system.renderMode ?? 'billboard',
      preHeat: v.system.preHeat ?? 1,
      background: v.system.background ?? '#0b0d12',
      blendMode: v.system.blendMode ?? 'additive',
    },
    emitter: v.emitter,
    spawnModifiers: v.spawnModifiers ?? [],
    updateModifiers: v.updateModifiers ?? [],
    renderModifiers: v.renderModifiers ?? [],
  };
}
