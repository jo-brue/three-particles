import { AdditiveBlending, Color, MultiplyBlending, NormalBlending, RepeatWrapping, SubtractiveBlending, Uniform, Vector2, Vector3 } from 'three';
import ParticleSystemEngine, {
  ParticleEmitterModifierPlugin,
  ParticleEmitterPlugin,
  ParticlePlugin,
} from '~/ParticleSystem/ParticleSystem';
import { BlendMode, ModifierInstance, ParamKind, ParticleSystemConfig } from '~/ParticleSystem/config/configTypes';
import { getPluginSpec, PluginSpec } from '~/ParticleSystem/config/registry';
import {
  buildColorGradientTexture,
  buildImageTexture,
  buildMatrix4,
  buildScalarGradientTexture,
  buildVec3GradientTexture,
  colorFromHex,
  Trs,
} from '~/ParticleSystem/config/textureBuilders';

export type UniformKey = string; // `${instanceId}:${paramName}`

function blendingConstant(mode: BlendMode) {
  switch (mode) {
    case 'additive': return AdditiveBlending;
    case 'multiply': return MultiplyBlending;
    case 'subtractive': return SubtractiveBlending;
    default: return NormalBlending;
  }
}

export interface BuiltSystem {
  system: ParticleSystemEngine;
  uniforms: Map<UniformKey, Uniform<any>>;
  dispose: () => void;
}

function uniformKey(instanceId: string, paramName: string): UniformKey {
  return `${instanceId}:${paramName}`;
}

const TEXTURE_KINDS = new Set<ParamKind>(['gradientColor', 'gradientScalar', 'gradientVec3', 'texture']);

// simpleNoise/heightOffsetNoise scroll this texture's UVs by uTime*speed without wrapping
// the coordinate back into [0,1] - with the default ClampToEdgeWrapping that scroll runs off
// the texture almost immediately and then just resamples the clamped edge row/column forever,
// which reads as a frozen stripe instead of animating. Needs RepeatWrapping to actually scroll.
function makeUniformValue(kind: ParamKind, value: any, paramName?: string): any {
  switch (kind) {
    case 'float': return value;
    case 'vec3': return new Vector3(value.x, value.y, value.z);
    case 'vec2': return new Vector2(value.x, value.y);
    case 'color': return colorFromHex(value);
    case 'matrix4': return buildMatrix4(value as Trs);
    case 'gradientColor': return buildColorGradientTexture(value.stops);
    case 'gradientScalar': return buildScalarGradientTexture(value.stops);
    case 'gradientVec3': return buildVec3GradientTexture(value.stops);
    case 'texture': {
      const tex = buildImageTexture(value.dataUrl);
      if (paramName !== 'noiseTexture') return tex;
      // buildImageTexture returns a cached/shared instance (the global fallback noise
      // texture when no dataUrl is set, or a per-dataUrl cache entry otherwise) - clone
      // rather than mutate its wrap mode in place, since other params (sprite/lookup
      // textures) may be pointing at that exact same shared instance.
      const scrolling = tex.clone();
      scrolling.wrapS = RepeatWrapping;
      scrolling.wrapT = RepeatWrapping;
      scrolling.userData = { ...scrolling.userData, isGlobal: false };
      scrolling.needsUpdate = true;
      return scrolling;
    }
    default: return value;
  }
}

function buildArgs(spec: PluginSpec, instance: ModifierInstance, uniforms: Map<UniformKey, Uniform<any>>): any[] {
  return spec.params.map((paramSpec) => {
    const raw = instance.params[paramSpec.name] ?? paramSpec.default;

    if (TEXTURE_KINDS.has(paramSpec.kind) || paramSpec.kind === 'float' || paramSpec.kind === 'vec3'
      || paramSpec.kind === 'vec2' || paramSpec.kind === 'color' || paramSpec.kind === 'matrix4') {
      const key = uniformKey(instance.id, paramSpec.name);
      const uniform = new Uniform(makeUniformValue(paramSpec.kind, raw, paramSpec.name));
      uniforms.set(key, uniform);
      return uniform;
    }

    switch (paramSpec.kind) {
      case 'matrix4plain':
        return raw ? buildMatrix4(raw as Trs) : undefined;
      case 'circlesList': {
        const list = raw as { count: number; radius: number; center: { x: number; y: number; z: number } }[];
        return list.map((c, i) => ({
          count: c.count,
          radius: c.radius,
          center: paramSpec.circlesCenterLive ? buildLiveCircleCenter(uniforms, instance.id, paramSpec.name, i, c.center) : { ...c.center },
        }));
      }
      case 'linesList': {
        const list = raw as { count: number; length: number; center: { x: number; y: number; z: number } }[];
        return list.map((l, i) => ({
          count: l.count,
          length: l.length,
          center: paramSpec.linesCenterLive ? buildLiveLineCenter(uniforms, instance.id, paramSpec.name, i, l.center) : { ...l.center },
        }));
      }
      default:
        return raw; // plainFloat, plainBool, plainVec3, lifeRange, json
    }
  });
}

function buildLiveCircleCenter(
  uniforms: Map<UniformKey, Uniform<any>>,
  instanceId: string,
  paramName: string,
  index: number,
  center: { x: number; y: number; z: number },
) {
  const key = uniformKey(instanceId, `${paramName}.${index}.center`);
  const uniform = new Uniform(new Vector3(center.x, center.y, center.z));
  uniforms.set(key, uniform);
  return uniform;
}

function buildLiveLineCenter(
  uniforms: Map<UniformKey, Uniform<any>>,
  instanceId: string,
  paramName: string,
  index: number,
  center: { x: number; y: number; z: number },
) {
  const key = uniformKey(instanceId, `${paramName}.${index}.center`);
  const uniform = new Uniform(new Vector3(center.x, center.y, center.z));
  uniforms.set(key, uniform);
  return uniform;
}

function buildModifier(instance: ModifierInstance, uniforms: Map<UniformKey, Uniform<any>>) {
  const spec = getPluginSpec(instance.type);
  if (!spec) {
    console.warn(`Unknown plugin type "${instance.type}" - skipped`);
    return null;
  }
  const args = buildArgs(spec, instance, uniforms);
  try {
    return spec.fn(...args);
  } catch (err) {
    console.error(`Failed to build plugin "${instance.type}"`, err);
    return null;
  }
}

export interface BuildOptions {
  /** ParticleSystem defaults to `visible = false` (consumers flip it once ready, e.g. after an
   *  orchestrated fade-in). Pass true to have it on screen immediately. Default: false. */
  visible?: boolean;
  /** Passed straight to the engine - set false to drive `system.update()` yourself. Default: true. */
  autoUpdate?: boolean;
}

export function buildParticleSystem(config: ParticleSystemConfig, options: BuildOptions = {}): BuiltSystem {
  const uniforms = new Map<UniformKey, Uniform<any>>();

  const emitterSpec = getPluginSpec(config.emitter.type);
  if (!emitterSpec) throw new Error(`Unknown emitter type "${config.emitter.type}"`);

  const emitterExtraArgs = buildArgs(emitterSpec, config.emitter, uniforms);
  const emitterArgs = emitterSpec.injectSystemSize ? [config.system.size, ...emitterExtraArgs] : emitterExtraArgs;
  const emitterPlugin: ParticleEmitterPlugin = emitterSpec.fn(...emitterArgs);

  const spawnPlugins = config.spawnModifiers
    .filter((m) => m.enabled)
    .map((m) => buildModifier(m, uniforms))
    .filter(Boolean) as ParticleEmitterModifierPlugin[];

  const updatePlugins = config.updateModifiers
    .filter((m) => m.enabled)
    .map((m) => buildModifier(m, uniforms))
    .filter(Boolean) as ParticlePlugin[];

  const renderPlugins = config.renderModifiers
    .filter((m) => m.enabled)
    .map((m) => buildModifier(m, uniforms))
    .filter(Boolean) as ParticlePlugin[];

  const system = new ParticleSystemEngine(
    {
      emitter: emitterPlugin,
      baseSize: config.system.baseSize,
      autoUpdate: options.autoUpdate ?? true,
      renderMode: config.system.renderMode,
      // three.js only applies a material's blending mode when `transparent` is true - for
      // NormalBlending it otherwise forces NoBlending (see WebGLState.setMaterial), so without
      // this the alpha channel is ignored entirely and particles render fully opaque regardless
      // of color/gradient alpha. Additive/multiply/subtractive aren't gated the same way, but
      // setting transparent unconditionally keeps all blend modes consistent.
      materialProps: { blending: blendingConstant(config.system.blendMode), transparent: true },
    },
    spawnPlugins,
    updatePlugins,
    renderPlugins,
    config.system.preHeat,
  );

  if (options.visible) system.visible = true;

  return {
    system,
    uniforms,
    dispose: () => {
      system.dispose();
      // system.dispose() only frees textures each material tracks as its own
      // (_ownedTextures); plugin-supplied gradient/image textures merged in from here
      // are ours to free.
      for (const uniform of uniforms.values()) {
        const value = uniform.value;
        if (value?.isTexture && !value.userData?.isGlobal) value.dispose();
      }
    },
  };
}

/** Mutates an existing Uniform's .value in place - no shader recompile. Only valid for
 *  LIVE_KINDS params (see configTypes.ts) whose Uniform is still bound to the currently
 *  compiled shader (i.e. nothing structural changed since the last full build). */
export function applyLiveUpdate(
  uniforms: Map<UniformKey, Uniform<any>>,
  instanceId: string,
  paramName: string,
  kind: ParamKind,
  value: any,
): boolean {
  const key = uniformKey(instanceId, paramName);
  const uniform = uniforms.get(key);
  if (!uniform) return false;

  if (TEXTURE_KINDS.has(kind)) {
    const old = uniform.value;
    uniform.value = makeUniformValue(kind, value, paramName);
    if (old?.isTexture && !old.userData?.isGlobal) old.dispose();
    return true;
  }

  switch (kind) {
    case 'float': uniform.value = value; return true;
    case 'vec3': uniform.value.set(value.x, value.y, value.z); return true;
    case 'vec2': uniform.value.set(value.x, value.y); return true;
    case 'color': uniform.value.set(value); return true;
    case 'matrix4': uniform.value = buildMatrix4(value as Trs); return true;
    default: return false;
  }
}

export function applyLiveCircleCenterUpdate(
  uniforms: Map<UniformKey, Uniform<any>>,
  instanceId: string,
  paramName: string,
  circleIndex: number,
  center: { x: number; y: number; z: number },
): boolean {
  const key = uniformKey(instanceId, `${paramName}.${circleIndex}.center`);
  const uniform = uniforms.get(key);
  if (!uniform) return false;
  uniform.value.set(center.x, center.y, center.z);
  return true;
}

export function applyLiveLineCenterUpdate(
  uniforms: Map<UniformKey, Uniform<any>>,
  instanceId: string,
  paramName: string,
  lineIndex: number,
  center: { x: number; y: number; z: number },
): boolean {
  const key = uniformKey(instanceId, `${paramName}.${lineIndex}.center`);
  const uniform = uniforms.get(key);
  if (!uniform) return false;
  uniform.value.set(center.x, center.y, center.z);
  return true;
}
