import { ParticleSystemConfig } from '~/ParticleSystem/config/configTypes';
import { validateConfig } from '~/ParticleSystem/config/validateConfig';

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
