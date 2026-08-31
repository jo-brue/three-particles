import { ParticleSystemConfig } from '../engine/configTypes';

export function downloadConfig(config: ParticleSystemConfig) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (config.name || 'particle-system').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'particle-system';
  a.download = `${safeName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function readConfigFile(file: File): Promise<ParticleSystemConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(validateConfig(JSON.parse(reader.result as string)));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function validateConfig(value: unknown): ParticleSystemConfig {
  if (!value || typeof value !== 'object') throw new Error('Not a valid particle system config: not an object');
  const v = value as Partial<ParticleSystemConfig>;
  if (!v.system || !v.emitter) throw new Error('Not a valid particle system config: missing "system" or "emitter"');
  return {
    version: 1,
    name: v.name ?? 'Untitled',
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
