import * as EmitterPlugins from '~/ParticleSystem/ParticlePluginsEmitter';
import * as UpdatePlugins from '~/ParticleSystem/ParticlePluginsUpdate';
import * as RenderPlugins from '~/ParticleSystem/ParticlePluginsRender';
import { ModifierSlot, ParamSpec, ParticleSystemSizeOption } from './configTypes';
import { IDENTITY_TRS } from './textureBuilders';

export interface PluginSpec {
  name: string;
  slot: ModifierSlot;
  label: string;
  params: ParamSpec[];
  fn: (...args: any[]) => any;
  /** rectangle/circle/circles/circlesStatic/line/lines/linesStatic take the system's
   *  particle-grid size as their first positional arg; the editor supplies it automatically
   *  instead of exposing it. */
  injectSystemSize?: boolean;
  /** Best-effort registry entry auto-derived from the function's runtime signature rather
   *  than hand-curated - shown with a generic JSON-args inspector. */
  isFallback?: boolean;
}

function vec2(x = 0, y = 0) { return { x, y }; }
function vec3(x = 0, y = 0, z = 0) { return { x, y, z }; }

function p(name: string, kind: ParamSpec['kind'], def: unknown, extra: Partial<ParamSpec> = {}): ParamSpec {
  return { name, kind, default: def, label: extra.label ?? autoLabel(name), ...extra };
}

function autoLabel(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

const EMITTER_PLUGINS: PluginSpec[] = [
  {
    name: 'rectangle', slot: 'emitter', label: 'Rectangle', injectSystemSize: true,
    fn: EmitterPlugins.rectangle,
    params: [
      p('lifeMinMax', 'lifeRange', [0.3, 1.5]),
      p('transform', 'matrix4plain', null, { label: 'Transform (optional)' }),
      p('randomize', 'plainFloat', 0, { min: 0, max: 2, step: 0.05 }),
    ],
  },
  {
    name: 'circle', slot: 'emitter', label: 'Circle', injectSystemSize: true,
    fn: EmitterPlugins.circle,
    params: [
      p('radius', 'plainFloat', 1, { min: 0, max: 20, step: 0.1 }),
      p('lifeMinMax', 'lifeRange', [0.3, 1.5]),
      p('transform', 'matrix4plain', null, { label: 'Transform (optional)' }),
      p('randomize', 'plainFloat', 0, { min: 0, max: 2, step: 0.05 }),
    ],
  },
  {
    name: 'circles', slot: 'emitter', label: 'Circles (multi-ring, live centers)', injectSystemSize: true,
    fn: EmitterPlugins.circles,
    params: [
      p('circles', 'circlesList', [{ count: -1, radius: 1, center: vec3() }], { circlesCenterLive: true }),
      p('lifeMinMax', 'lifeRange', [0.3, 1.5]),
      p('transform', 'matrix4plain', null, { label: 'Transform (optional)' }),
      p('randomize', 'plainFloat', 0, { min: 0, max: 2, step: 0.05 }),
    ],
  },
  {
    name: 'circlesStatic', slot: 'emitter', label: 'Circles (multi-ring, static)', injectSystemSize: true,
    fn: EmitterPlugins.circlesStatic,
    params: [
      p('circles', 'circlesList', [{ count: -1, radius: 1, center: vec3() }], { circlesCenterLive: false }),
      p('lifeMinMax', 'lifeRange', [0.3, 1.5]),
      p('transform', 'matrix4plain', null, { label: 'Transform (optional)' }),
      p('randomize', 'plainFloat', 0, { min: 0, max: 2, step: 0.05 }),
    ],
  },
  {
    name: 'line', slot: 'emitter', label: 'Line', injectSystemSize: true,
    fn: EmitterPlugins.line,
    params: [
      p('length', 'plainFloat', 2, { min: 0, max: 20, step: 0.05 }),
      p('lifeMinMax', 'lifeRange', [0.3, 1.5]),
      p('transform', 'matrix4plain', null, { label: 'Transform (optional)' }),
      p('randomize', 'plainFloat', 0, { min: 0, max: 2, step: 0.05 }),
    ],
  },
  {
    name: 'lines', slot: 'emitter', label: 'Lines (multi-segment, live centers)', injectSystemSize: true,
    fn: EmitterPlugins.lines,
    params: [
      p('lines', 'linesList', [{ count: -1, length: 2, center: vec3() }], { linesCenterLive: true }),
      p('lifeMinMax', 'lifeRange', [0.3, 1.5]),
      p('transform', 'matrix4plain', null, { label: 'Transform (optional)' }),
      p('randomize', 'plainFloat', 0, { min: 0, max: 2, step: 0.05 }),
    ],
  },
  {
    name: 'linesStatic', slot: 'emitter', label: 'Lines (multi-segment, static)', injectSystemSize: true,
    fn: EmitterPlugins.linesStatic,
    params: [
      p('lines', 'linesList', [{ count: -1, length: 2, center: vec3() }], { linesCenterLive: false }),
      p('lifeMinMax', 'lifeRange', [0.3, 1.5]),
      p('transform', 'matrix4plain', null, { label: 'Transform (optional)' }),
      p('randomize', 'plainFloat', 0, { min: 0, max: 2, step: 0.05 }),
    ],
  },
];

const SPAWN_PLUGINS: PluginSpec[] = [
  {
    name: 'applayMatrix', slot: 'spawn', label: 'Apply Matrix', fn: EmitterPlugins.applayMatrix,
    params: [p('matrix', 'matrix4', IDENTITY_TRS)],
  },
  {
    name: 'curve', slot: 'spawn', label: 'Curve', fn: EmitterPlugins.curve,
    params: [p('curvature', 'float', 0.5, { min: -3, max: 3, step: 0.01 })],
  },
  {
    name: 'frame', slot: 'spawn', label: 'Frame', fn: EmitterPlugins.frame,
    params: [
      p('size', 'float', 0.3, { min: 0, max: 1, step: 0.01 }),
      p('thickness', 'float', 0.05, { min: 0, max: 1, step: 0.01 }),
    ],
  },
  {
    name: 'controlTexture', slot: 'spawn', label: 'Control Texture', fn: EmitterPlugins.controlTexture,
    params: [
      p('controlTexture', 'texture', { dataUrl: null }),
      p('contrast', 'float', 0.5, { min: 0, max: 1, step: 0.01 }),
    ],
  },
  {
    name: 'killAreaPillow', slot: 'spawn', label: 'Kill Area (Pillow)', fn: EmitterPlugins.killAreaPillow,
    params: [p('size', 'float', 0.3, { min: 0, max: 1, step: 0.01 })],
  },
  {
    name: 'killAreaRound', slot: 'spawn', label: 'Kill Area (Round)', fn: EmitterPlugins.killAreaRound,
    params: [
      p('position', 'vec3', vec3()),
      p('size', 'float', 1, { min: 0, max: 20, step: 0.1 }),
      p('invert', 'plainBool', true),
    ],
  },
  {
    name: 'killAreaRoundUV', slot: 'spawn', label: 'Kill Area (Round, Grid UV)', fn: EmitterPlugins.killAreaRoundUV,
    params: [
      p('position', 'vec2', vec2(0.5, 0.5)),
      p('size', 'float', 0.3, { min: 0, max: 1.5, step: 0.01 }),
      p('invert', 'plainBool', true),
    ],
  },
  {
    name: 'simpleNoise', slot: 'spawn', label: 'Simple Noise', fn: EmitterPlugins.simpleNoise,
    params: [
      p('noiseTexture', 'texture', { dataUrl: null }),
      p('noiseSpeed', 'vec2', vec2(0, 0.1), { min: -2, max: 2, step: 0.01 }),
      p('noiseScale', 'float', 1, { min: 0, max: 10, step: 0.1 }),
      p('pixelate', 'float', 24, { min: 1, max: 128, step: 1 }),
      p('noiseStrength', 'float', 1, { min: 0, max: 5, step: 0.1 }),
      p('contrast', 'float', 0.5, { min: 0, max: 1, step: 0.01 }),
    ],
  },
  {
    name: 'simpleNoiseInPlace', slot: 'spawn', label: 'Simple Noise (In Place)', fn: EmitterPlugins.simpleNoiseInPlace,
    params: [
      p('noiseTexture', 'texture', { dataUrl: null }),
      p('noiseSpeed', 'float', 1, { min: -10, max: 10, step: 0.05, label: 'Orbit Speed' }),
      p('noiseScale', 'float', 0.1, { min: 0, max: 2, step: 0.01, label: 'Orbit Radius' }),
      p('pixelate', 'float', 24, { min: 1, max: 128, step: 1 }),
      p('noiseStrength', 'float', 1, { min: 0, max: 5, step: 0.1 }),
      p('contrast', 'float', 0.5, { min: 0, max: 1, step: 0.01 }),
    ],
  },
  {
    name: 'simpleNoise3D', slot: 'spawn', label: 'Simple Noise (3D)', fn: EmitterPlugins.simpleNoise3D,
    params: [
      p('noiseSpeed', 'float', 0.3, { min: -5, max: 5, step: 0.01, label: 'Evolve Speed' }),
      p('noiseScale', 'float', 3, { min: 0, max: 20, step: 0.1 }),
      p('pixelate', 'float', 24, { min: 1, max: 128, step: 1 }),
      p('noiseStrength', 'float', 1, { min: 0, max: 5, step: 0.1 }),
      p('contrast', 'float', 0.5, { min: 0, max: 1, step: 0.01 }),
    ],
  },
  {
    name: 'heightOffsetNoise', slot: 'spawn', label: 'Height Offset Noise', fn: EmitterPlugins.heightOffsetNoise,
    params: [
      p('noiseTexture', 'texture', { dataUrl: null }),
      p('noiseSpeed', 'float', 0.1, { min: -2, max: 2, step: 0.01 }),
      p('noiseScale', 'float', 1, { min: 0, max: 10, step: 0.1 }),
      p('offset', 'float', 1, { min: -10, max: 10, step: 0.1 }),
      p('contrast', 'float', 0.5, { min: 0, max: 1, step: 0.01 }),
    ],
  },
  {
    name: 'voronoiAreas', slot: 'spawn', label: 'Voronoi Areas', fn: EmitterPlugins.voronoiAreas,
    params: [
      p('noiseSpeed', 'float', 0.2, { min: -2, max: 2, step: 0.01 }),
      p('noiseScale_1', 'float', 1, { min: 0, max: 10, step: 0.1 }),
      p('noiseScale_2', 'float', 2, { min: 0, max: 10, step: 0.1 }),
      p('contrast', 'float', 0.5, { min: 0, max: 1, step: 0.01 }),
    ],
  },
  {
    name: 'constantSpawn', slot: 'spawn', label: 'Constant Spawn', fn: EmitterPlugins.constantSpawn,
    params: [],
  },
  {
    name: 'constantSpawnArea', slot: 'spawn', label: 'Constant Spawn Area', fn: EmitterPlugins.constantSpawnArea,
    params: [
      p('position', 'vec3', vec3()),
      p('size', 'float', 1, { min: 0, max: 20, step: 0.1 }),
    ],
  },
  {
    name: 'limit', slot: 'spawn', label: 'Limit (radial clamp)', fn: EmitterPlugins.limit,
    params: [
      p('size', 'float', 1, { min: 0, max: 20, step: 0.1 }),
      p('center', 'vec3', vec3()),
    ],
  },
];

const UPDATE_PLUGINS: PluginSpec[] = [
  {
    name: 'turbulence', slot: 'update', label: 'Turbulence', fn: UpdatePlugins.turbulence,
    params: [
      p('curlSize', 'float', 1, { min: 0, max: 10, step: 0.01 }),
      p('speed', 'float', 0.015, { min: 0, max: 0.02, step: 0.0001 }),
    ],
  },
  {
    name: 'turbulenceV2', slot: 'update', label: 'Turbulence V2', fn: UpdatePlugins.turbulenceV2,
    params: [
      p('curlSize', 'float', 1, { min: 0, max: 10, step: 0.01 }),
      p('speed', 'float', 0.015, { min: 0, max: 0.02, step: 0.0001 }),
      p('strength', 'float', 1, { min: 0, max: 5, step: 0.01 }),
      p('modify', 'vec3', vec3(1, 1, 1)),
    ],
  },
  {
    name: 'transform', slot: 'update', label: 'Transform (matrix)', fn: UpdatePlugins.transform,
    params: [p('transform', 'matrix4', IDENTITY_TRS)],
  },
  {
    name: 'velocity', slot: 'update', label: 'Velocity', fn: UpdatePlugins.velocity,
    params: [p('_vel', 'vec3', vec3(0, 1, 0), { label: 'Velocity' })],
  },
  {
    name: 'velocityOverLife', slot: 'update', label: 'Velocity Over Life', fn: UpdatePlugins.velocityOverLife,
    params: [p('tex', 'gradientVec3', { stops: [[0, vec3(0, 1, 0)], [1, vec3(0, 0, 0)]] }, { label: 'Velocity Curve' })],
  },
  {
    name: 'maskedVelocity', slot: 'update', label: 'Masked Velocity', fn: UpdatePlugins.maskedVelocity,
    params: [
      p('velocity', 'vec3', vec3(0, 1, 0)),
      p('position', 'vec3', vec3()),
      p('maskSize', 'float', 1, { min: 0, max: 20, step: 0.1 }),
    ],
  },
  {
    name: 'velocityRing', slot: 'update', label: 'Velocity Ring', fn: UpdatePlugins.velocityRing,
    params: [
      p('velocity', 'vec3', vec3(0, 1, 0)),
      p('position', 'vec3', vec3()),
      p('size', 'float', 1, { min: 0, max: 20, step: 0.1 }),
    ],
  },
  {
    name: 'velocityArea', slot: 'update', label: 'Velocity Area', fn: UpdatePlugins.velocityArea,
    params: [
      p('velocity', 'vec3', vec3(0, 1, 0)),
      p('position', 'vec3', vec3()),
      p('size', 'float', 1, { min: 0, max: 20, step: 0.1 }),
    ],
  },
  {
    name: 'velocityAreaVertical', slot: 'update', label: 'Velocity Area (Vertical band)', fn: UpdatePlugins.velocityAreaVertical,
    params: [
      p('velocity', 'vec3', vec3(0, 1, 0)),
      p('upperBound', 'float', 1, { min: -20, max: 20, step: 0.1 }),
      p('lowerBound', 'float', 0, { min: -20, max: 20, step: 0.1 }),
      p('softedge', 'float', 0.1, { min: 0, max: 5, step: 0.01 }),
    ],
  },
  {
    name: 'attractorTopic', slot: 'update', label: 'Attractor (Topic)', fn: UpdatePlugins.attractorTopic,
    params: [
      p('position', 'vec3', vec3()),
      p('size', 'float', 3, { min: 0, max: 30, step: 0.1 }),
      p('force', 'float', 1, { min: -10, max: 10, step: 0.1 }),
      p('weights', 'vec3', vec3(1, 1, 1)),
      p('offset', 'vec3', vec3()),
    ],
  },
  {
    name: 'tornado', slot: 'update', label: 'Tornado', fn: UpdatePlugins.tornado,
    params: [
      p('position', 'vec3', vec3()),
      p('size', 'float', 3, { min: 0, max: 30, step: 0.1 }),
      p('force', 'float', 1, { min: -10, max: 10, step: 0.1 }),
      p('swirlForce', 'float', 1, { min: -10, max: 10, step: 0.1 }),
      p('offset', 'vec3', vec3()),
    ],
  },
  {
    name: 'tornadosimple', slot: 'update', label: 'Tornado (simple)', fn: UpdatePlugins.tornadosimple,
    params: [
      p('position', 'vec3', vec3()),
      p('size', 'float', 3, { min: 0, max: 30, step: 0.1 }),
      p('swirlForce', 'float', 1, { min: -10, max: 10, step: 0.1 }),
      p('offset', 'vec3', vec3()),
    ],
  },
  {
    name: 'tornadoAreaVertical', slot: 'update', label: 'Tornado (Vertical band)', fn: UpdatePlugins.tornadoAreaVertical,
    params: [
      p('position', 'vec3', vec3()),
      p('size', 'float', 3, { min: 0, max: 30, step: 0.1 }),
      p('swirlForce', 'float', 1, { min: -10, max: 10, step: 0.1 }),
      p('offset', 'vec3', vec3()),
      p('lowerBound', 'float', 0, { min: -20, max: 20, step: 0.1 }),
      p('upperBound', 'float', 1, { min: -20, max: 20, step: 0.1 }),
      p('softedge', 'float', 0.1, { min: 0, max: 5, step: 0.01 }),
    ],
  },
  {
    name: 'attractorMasked', slot: 'update', label: 'Attractor (Masked)', fn: UpdatePlugins.attractorMasked,
    params: [
      p('position', 'vec3', vec3()),
      p('size', 'float', 3, { min: 0, max: 30, step: 0.1 }),
      p('force', 'float', 1, { min: -10, max: 10, step: 0.1 }),
      p('maskSize', 'float', 1, { min: 0, max: 20, step: 0.1 }),
      p('weights', 'vec3', vec3(1, 1, 1)),
      p('offset', 'vec3', vec3()),
    ],
  },
  {
    name: 'attractor', slot: 'update', label: 'Attractor', fn: UpdatePlugins.attractor,
    params: [
      p('position', 'vec3', vec3()),
      p('size', 'float', 3, { min: 0, max: 30, step: 0.1 }),
      p('force', 'float', 1, { min: -10, max: 10, step: 0.1 }),
      p('weights', 'vec3', vec3(1, 1, 1)),
      p('offset', 'vec3', vec3()),
      p('maskSize', 'float', 0, { min: 0, max: 20, step: 0.1 }),
    ],
  },
  {
    name: 'floor', slot: 'update', label: 'Floor', fn: UpdatePlugins.floor,
    params: [p('position', 'float', 0, { min: -20, max: 20, step: 0.1, label: 'Height' })],
  },
  {
    name: 'turbulenceArea', slot: 'update', label: 'Turbulence Area', fn: UpdatePlugins.turbulenceArea,
    params: [
      p('curlSize', 'float', 1, { min: 0, max: 10, step: 0.01 }),
      p('speed', 'float', 0.015, { min: 0, max: 0.02, step: 0.0001 }),
      p('size', 'float', 3, { min: 0, max: 30, step: 0.1 }),
      p('position', 'vec3', vec3()),
      p('minAffection', 'float', 0, { min: 0, max: 1, step: 0.01 }),
    ],
  },
  {
    name: 'turbulenceAreaVertical', slot: 'update', label: 'Turbulence Area (Vertical band)', fn: UpdatePlugins.turbulenceAreaVertical,
    params: [
      p('curlSize', 'float', 1, { min: 0, max: 10, step: 0.01 }),
      p('speed', 'float', 0.015, { min: 0, max: 0.02, step: 0.0001 }),
      p('strength', 'float', 1, { min: 0, max: 5, step: 0.01 }),
      p('upperBound', 'float', 1, { min: -20, max: 20, step: 0.1 }),
      p('lowerBound', 'float', 0, { min: -20, max: 20, step: 0.1 }),
      p('softedge', 'float', 0.1, { min: 0, max: 5, step: 0.01 }),
    ],
  },
  {
    name: 'planeBarrier', slot: 'update', label: 'Plane Barrier', fn: UpdatePlugins.planeBarrier,
    params: [
      p('planeTransform', 'matrix4', IDENTITY_TRS, { label: 'Plane Transform' }),
      p('bounciness', 'float', 0, { min: 0, max: 2, step: 0.01 }),
    ],
  },
  {
    name: 'lineRasterAttractor', slot: 'update', label: 'Line Raster Attractor', fn: UpdatePlugins.lineRasterAttractor,
    params: [
      p('spacing', 'float', 1, { min: 0.05, max: 1, step: 0.001 }),
      p('force', 'float', 0.3, { min: -0.7, max: 0.7, step: 0.01 }),
      p('axis', 'vec3', vec3(1, 0, 0), {
        min: -1, max: 1, step: 1,
        label: 'Axis (0=off, +1=attracts toward increasing/up, -1=toward decreasing/down; e.g. {0,1,0}=horizontal lines, bottom-to-top only)',
      }),
      p('origin', 'vec3', vec3()),
      p('falloffSize', 'float', 0.5, { min: 0, max: 5, step: 0.01, label: 'Falloff Size (distance the pull decelerates over; 0 = constant force, no collecting)' }),
      p('falloffStrength', 'float', 1, { min: 0.1, max: 6, step: 0.1, label: 'Falloff Strength (1 = linear, higher = snaps in tighter near the line)' }),
    ],
  },
  {
    name: 'circularLineRasterAttractor', slot: 'update', label: 'Circular Line Raster Attractor', fn: UpdatePlugins.circularLineRasterAttractor,
    params: [
      p('spacing', 'float', 1, { min: 0.05, max: 5, step: 0.01, label: 'Ring Spacing' }),
      p('force', 'float', 0.3, { min: -0.7, max: 0.7, step: 0.01 }),
      p('direction', 'float', 1, { min: -1, max: 1, step: 2, label: 'Direction (+1 = grow outward, -1 = shrink inward)' }),
      p('plane', 'select', 'xy', { options: ['xy', 'xz', 'yz'], label: 'Ring Plane' }),
      p('origin', 'vec3', vec3()),
      p('falloffSize', 'float', 0.5, { min: 0, max: 5, step: 0.01, label: 'Falloff Size (distance the pull decelerates over; 0 = constant force, no collecting)' }),
      p('falloffStrength', 'float', 1, { min: 0.1, max: 6, step: 0.1, label: 'Falloff Strength (1 = linear, higher = snaps in tighter near the ring)' }),
    ],
  },
  {
    name: 'circularLineRasterAttractorMasked', slot: 'update', label: 'Circular Line Raster Attractor (Masked)', fn: UpdatePlugins.circularLineRasterAttractorMasked,
    params: [
      p('spacing', 'float', 1, { min: 0.05, max: 5, step: 0.01, label: 'Ring Spacing' }),
      p('force', 'float', 0.3, { min: -0.7, max: 0.7, step: 0.01 }),
      p('maskSize', 'float', 1, { min: 0, max: 10, step: 0.01, label: 'Mask Size (radius around origin with no pull)' }),
      p('maskFalloff', 'float', 0.5, { min: 0, max: 10, step: 0.01, label: 'Mask Falloff (distance beyond Mask Size the pull ramps back up over)' }),
      p('direction', 'float', 1, { min: -1, max: 1, step: 2, label: 'Direction (+1 = grow outward, -1 = shrink inward)' }),
      p('plane', 'select', 'xy', { options: ['xy', 'xz', 'yz'], label: 'Ring Plane' }),
      p('origin', 'vec3', vec3()),
      p('falloffSize', 'float', 0.5, { min: 0, max: 5, step: 0.01, label: 'Falloff Size (distance the pull decelerates over; 0 = constant force, no collecting)' }),
      p('falloffStrength', 'float', 1, { min: 0.1, max: 6, step: 0.1, label: 'Falloff Strength (1 = linear, higher = snaps in tighter near the ring)' }),
    ],
  },
  {
    name: 'chladni', slot: 'update', label: 'Chladni Pattern', fn: UpdatePlugins.chladni,
    params: [
      p('n', 'float', 3, { min: 1, max: 12, step: 1, label: 'Mode N' }),
      p('m', 'float', 5, { min: 1, max: 12, step: 1, label: 'Mode M' }),
      p('size', 'float', 5, { min: 0.1, max: 30, step: 0.1, label: 'Plate Size' }),
      p('strength', 'float', 1, { min: 0, max: 10, step: 0.05, label: 'Jitter Strength' }),
      p('damping', 'float', 1, { min: 0.1, max: 5, step: 0.05, label: 'Damping (>1 sharpens the pattern, <1 softens it)' }),
      p('plane', 'select', 'xy', { options: ['xy', 'xz', 'yz'], label: 'Plate Plane' }),
    ],
  },
  {
    name: 'lineSpreadAttractor', slot: 'update', label: 'Line Spread Attractor', fn: UpdatePlugins.lineSpreadAttractor,
    params: [
      p('lineHeight', 'float', 0, { min: -10, max: 10, step: 0.01, label: 'Line Height (y)' }),
      p('force', 'float', 0.5, { min: -2, max: 2, step: 0.01, label: 'Force (pull toward the line)' }),
      p('outwardForce', 'float', 0.3, { min: -2, max: 2, step: 0.01, label: 'Outward Force (x-spread near the line)' }),
      p('gap', 'float', 0, { min: 0, max: 5, step: 0.01, label: 'Gap (empty band left/right of the line)' }),
      p('centerX', 'float', 0.5, { min: -10, max: 10, step: 0.01, label: 'Center X (split point for outward push)' }),
      p('falloffSize', 'float', 0.5, { min: 0, max: 5, step: 0.01, label: 'Falloff Size (distance over which pull/spread swap ramps)' }),
      p('falloffStrength', 'float', 1, { min: 0.1, max: 6, step: 0.1, label: 'Falloff Strength (1 = linear, higher = sharper switch near the line)' }),
    ],
  },
  {
    name: 'ellipsoidDeflector', slot: 'update', label: 'Ellipsoid Deflector', fn: UpdatePlugins.ellipsoidDeflector,
    params: [
      p('center', 'vec3', vec3()),
      p('radii', 'vec3', vec3(1, 1, 1), { min: 0.01, max: 20, step: 0.01, label: 'Radii (rx, ry, rz)' }),
      p('force', 'float', 1, { min: 0, max: 5, step: 0.01, label: 'Force (outward push near the surface)' }),
      p('swirlForce', 'float', 1, { min: 0, max: 5, step: 0.01, label: 'Swirl Force (sideways flow-around near the surface)' }),
      p('falloffSize', 'float', 0.5, { min: 0, max: 5, step: 0.01, label: 'Falloff Size (extra normalized distance beyond the surface the field reaches)' }),
      p('falloffStrength', 'float', 1, { min: 0.1, max: 6, step: 0.1, label: 'Falloff Strength (1 = linear, higher = drops off sharply at the outer edge)' }),
    ],
  },
];

const RENDER_PLUGINS: PluginSpec[] = [
  {
    name: 'colorOverLife', slot: 'render', label: 'Color Over Life', fn: RenderPlugins.colorOverLife,
    params: [p('tex', 'gradientColor', {
      stops: [[0, 'rgba(255,255,255,0)'], [0.15, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']],
    }, { label: 'Color Curve' })],
  },
  {
    name: 'colorRing', slot: 'render', label: 'Color Ring', fn: RenderPlugins.colorRing,
    params: [
      p('color', 'color', '#ffffff'),
      p('position', 'vec3', vec3()),
      p('size', 'float', 1, { min: 0, max: 20, step: 0.1 }),
    ],
  },
  { name: 'round', slot: 'render', label: 'Round', fn: RenderPlugins.round, params: [] },
  {
    name: 'textured', slot: 'render', label: 'Textured', fn: RenderPlugins.textured,
    params: [p('tex', 'texture', { dataUrl: null }, { label: 'Sprite' })],
  },
  {
    name: 'flicker', slot: 'render', label: 'Flicker', fn: RenderPlugins.flicker,
    params: [p('speed', 'float', 1, { min: 0, max: 10, step: 0.01 })],
  },
  {
    name: 'soft', slot: 'render', label: 'Soft', fn: RenderPlugins.soft,
    params: [p('contrast', 'vec2', { x: 0, y: 1 })],
  },
  {
    name: 'color', slot: 'render', label: 'Color', fn: RenderPlugins.color,
    params: [p('col', 'color', '#ffffff', { label: 'Color' })],
  },
  {
    name: 'colorFromLookup', slot: 'render', label: 'Color From Lookup', fn: RenderPlugins.colorFromLookup,
    params: [p('tex', 'texture', { dataUrl: null }, { label: 'Lookup Image' })],
  },
  {
    name: 'switchGeometries', slot: 'render', label: 'Switch Geometries', fn: RenderPlugins.switchGeometries,
    params: [p('threshhold', 'plainFloat', 0.5, { min: 0, max: 1, step: 0.01, label: 'Threshold' })],
  },
  {
    name: 'colorArea', slot: 'render', label: 'Color Area', fn: RenderPlugins.colorArea,
    params: [
      p('color', 'color', '#ffffff'),
      p('position', 'vec3', vec3()),
      p('size', 'float', 1, { min: 0, max: 20, step: 0.1 }),
    ],
  },
  {
    name: 'sampleFromImageAtSpawn', slot: 'render', label: 'Sample From Image', fn: RenderPlugins.sampleFromImageAtSpawn,
    params: [
      p('tex', 'texture', { dataUrl: null }, { label: 'Image' }),
      p('size', 'float', 1, { min: 0.01, max: 10, step: 0.01, label: 'Size' }),
      p('aspect', 'float', 1, { min: 0.1, max: 10, step: 0.01, label: 'Aspect Ratio' }),
      p('ignoreAlpha', 'plainBool', false, { label: 'Ignore Alpha' }),
    ],
  },
  {
    name: 'sampleFromImageContinuous', slot: 'render', label: 'Sample From Image (Continuous)', fn: RenderPlugins.sampleFromImageContinuous,
    params: [
      p('tex', 'texture', { dataUrl: null }, { label: 'Image' }),
      p('position', 'vec3', vec3(), { label: 'Plane Center' }),
      p('size', 'float', 5, { min: 0.01, max: 50, step: 0.1, label: 'Size' }),
      p('aspect', 'float', 1, { min: 0.1, max: 10, step: 0.01, label: 'Aspect Ratio' }),
      p('plane', 'select', 'xy', { options: ['xy', 'xz', 'yz'], label: 'Projection Plane' }),
      p('ignoreAlpha', 'plainBool', false, { label: 'Ignore Alpha' }),
    ],
  },
  {
    name: 'sampleFromImage', slot: 'render', label: 'Sample From Image (Legacy)', fn: RenderPlugins.sampleFromImage,
    params: [
      p('tex', 'texture', { dataUrl: null }, { label: 'Image' }),
      p('transform', 'matrix4', IDENTITY_TRS, { label: 'Transform (optional)' }),
    ],
  },
  {
    name: 'sizeOverLife', slot: 'render', label: 'Size Over Life', fn: RenderPlugins.sizeOverLife,
    params: [p('tex', 'gradientScalar', { stops: [[0, 0], [0.2, 1], [1, 0]] }, { label: 'Size Curve' })],
  },
  {
    name: 'scaleArea', slot: 'render', label: 'Scale Area', fn: RenderPlugins.scaleArea,
    params: [
      p('position', 'vec3', vec3()),
      p('size', 'float', 1, { min: 0, max: 20, step: 0.1 }),
      p('scale', 'float', 0.5, { min: 0, max: 5, step: 0.01 }),
    ],
  },
];

export const REGISTRY: PluginSpec[] = [...EMITTER_PLUGINS, ...SPAWN_PLUGINS, ...UPDATE_PLUGINS, ...RENDER_PLUGINS];

const CURATED_NAMES = new Set(REGISTRY.map((p) => p.name));

/**
 * Runtime-introspection fallback: any function exported by the plugin modules that isn't
 * curated above still shows up in the library (as a generic JSON-args entry) instead of
 * silently disappearing. This keeps the editor in sync with plugins added to the engine
 * after this registry was written.
 */
function buildFallbackSpecs(mod: Record<string, unknown>, slot: ModifierSlot): PluginSpec[] {
  const specs: PluginSpec[] = [];
  for (const [name, fn] of Object.entries(mod)) {
    if (typeof fn !== 'function' || CURATED_NAMES.has(name)) continue;
    const argNames = extractArgNames(fn as (...a: any[]) => unknown);
    specs.push({
      name,
      slot,
      label: `${autoLabel(name)} (auto)`,
      fn: fn as (...a: any[]) => unknown,
      isFallback: true,
      params: argNames.map((n) => p(n, 'json', null)),
    });
  }
  return specs;
}

function extractArgNames(fn: (...a: any[]) => unknown): string[] {
  const src = fn.toString();
  const match = src.match(/^[^(]*\(([^)]*)\)/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split('=')[0].trim());
}

export const FALLBACK_REGISTRY: PluginSpec[] = [
  ...buildFallbackSpecs(EmitterPlugins, 'spawn'),
  ...buildFallbackSpecs(UpdatePlugins, 'update'),
  ...buildFallbackSpecs(RenderPlugins, 'render'),
];

export const ALL_PLUGINS: PluginSpec[] = [...REGISTRY, ...FALLBACK_REGISTRY];

export function getPluginSpec(name: string): PluginSpec | undefined {
  return ALL_PLUGINS.find((s) => s.name === name);
}

export function pluginsForSlot(slot: ModifierSlot): PluginSpec[] {
  return ALL_PLUGINS.filter((s) => s.slot === slot);
}

export const EMITTER_SIZE_OPTIONS: ParticleSystemSizeOption[] = [8, 16, 32, 64, 128, 256, 512, 1024];
