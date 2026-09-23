import { DEFAULT_CAMERA_STATE, makeInstanceId, ParticleSystemConfig } from '~/ParticleSystem/config/configTypes';

export function createDefaultConfig(): ParticleSystemConfig {
  return {
    version: 1,
    name: 'Embers',
    camera: { ...DEFAULT_CAMERA_STATE },
    showGizmos: true,
    system: {
      size: 64,
      baseSize: 34,
      renderMode: 'billboard',
      preHeat: 1,
      background: '#0b0d12',
      blendMode: 'additive',
    },
    emitter: {
      id: makeInstanceId(),
      type: 'circle',
      enabled: true,
      params: {
        radius: 1.2,
        lifeMinMax: [1.2, 2.6],
        randomize: 0.4,
      },
    },
    spawnModifiers: [
      // Emitters only seed position on respawn - something has to reset `age` back to 0 for
      // particles to respawn continuously, or they die once and never come back to life.
      { id: makeInstanceId(), type: 'constantSpawn', enabled: true, params: {} },
    ],
    updateModifiers: [
      {
        id: makeInstanceId(),
        type: 'velocity',
        enabled: true,
        params: { _vel: { x: 0, y: 1.1, z: 0 } },
      },
      {
        id: makeInstanceId(),
        type: 'turbulence',
        enabled: true,
        params: { curlSize: 1.3, speed: 0.015 },
      },
    ],
    renderModifiers: [
      // soft() *replaces* color (a falloff disc); colorOverLife() *multiplies* it - soft
      // has to run first or it clobbers the tint colorOverLife just applied.
      {
        id: makeInstanceId(),
        type: 'soft',
        enabled: true,
        params: { contrast: { x: 0, y: 1 } },
      },
      {
        id: makeInstanceId(),
        type: 'colorOverLife',
        enabled: true,
        params: {
          tex: {
            stops: [
              [0, 'rgba(255,180,60,0)'],
              [0.12, 'rgba(255,150,40,1)'],
              [0.5, 'rgba(255,90,20,0.8)'],
              [1, 'rgba(120,20,10,0)'],
            ],
          },
        },
      },
      {
        id: makeInstanceId(),
        type: 'sizeOverLife',
        enabled: true,
        params: { tex: { stops: [[0, 0], [0.15, 1], [1, 0.1]] } },
      },
    ],
  };
}
