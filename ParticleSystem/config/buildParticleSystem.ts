import { AdditiveBlending, Color, MultiplyBlending, NormalBlending, RepeatWrapping, SubtractiveBlending, Uniform, Vector2, Vector3 } from 'three';
import ParticleSystemEngine, {
  ParticleEmitterModifierPlugin,
  ParticleEmitterPlugin,
  ParticlePlugin,
} from '~/ParticleSystem/ParticleSystem';
import {
  BAKEABLE_KINDS,
  BlendMode,
  exposedName,
  LIVE_KINDS,
  ModifierInstance,
  ModifierSlot,
  ParamKind,
  ParamSpec,
  ParticleSystemConfig,
} from '~/ParticleSystem/config/configTypes';
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

export interface ExposedParam {
  name: string;
  slot: ModifierSlot;
  instanceId: string;
  modifierType: string;
  param: string;
  kind: ParamKind;
}

export interface BuiltSystem {
  system: ParticleSystemEngine;
  /** Every Uniform the loader created, keyed `${instanceId}:${paramName}`. */
  uniforms: Map<UniformKey, Uniform<any>>;
  /** The exposed params (see ModifierInstance.exposed) by public name. Mutate `.value` in
   *  place (`params.wind.value.set(1, 0, 0)`), or use setParam() for JSON-style values. */
  params: Record<string, Uniform<any>>;
  exposed: ExposedParam[];
  /** Sets an exposed param from the same JSON-style value the editor saves ({x,y,z}, '#rrggbb',
   *  gradient stops, ...) - rebuilds textures for gradient/texture params. False if `name`
   *  isn't exposed (or its modifier is disabled). */
  setParam: (name: string, value: unknown) => boolean;
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

/** Plain (non-Uniform) value for a BAKEABLE_KINDS param - the plugin's handleProp() writes it
 *  into the GLSL source as a literal. */
function makeBakedValue(kind: ParamKind, value: any): any {
  switch (kind) {
    case 'vec3': return new Vector3(value.x, value.y, value.z);
    case 'vec2': return new Vector2(value.x, value.y);
    case 'color': return colorFromHex(value);
    default: return value;
  }
}

type LivePredicate = (paramSpec: ParamSpec) => boolean;

function buildArgs(spec: PluginSpec, instance: ModifierInstance, uniforms: Map<UniformKey, Uniform<any>>, isLive: LivePredicate): any[] {
  return spec.params.map((paramSpec) => {
    const raw = instance.params[paramSpec.name] ?? paramSpec.default;

    if (BAKEABLE_KINDS.has(paramSpec.kind) && !isLive(paramSpec)) {
      return makeBakedValue(paramSpec.kind, raw);
    }

    if (LIVE_KINDS.has(paramSpec.kind)) {
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

function disposeOwnedTextures(uniforms: Iterable<Uniform<any>>) {
  for (const uniform of uniforms) {
    const value = uniform.value;
    if (value?.isTexture && !value.userData?.isGlobal) value.dispose();
  }
}

/** A plugin that passes a param through handleUniformProp() (which assumes a Uniform) stores a
 *  baked plain value in its uniforms map as-is - three.js would then fail on it at render time. */
function hasNonUniformEntry(plugin: { uniforms?: Record<string, unknown> }): boolean {
  return Object.values(plugin.uniforms ?? {}).some((u) => !(u instanceof Uniform));
}

/** Calls the plugin function with baked constants for every non-live bakeable param. If the
 *  plugin turns out not to accept a plain value for one of them (not flagged uniformOnly in the
 *  registry, e.g. a plugin added to the engine later), rebuilds it with everything live. */
function buildPlugin(
  spec: PluginSpec,
  instance: ModifierInstance,
  uniforms: Map<UniformKey, Uniform<any>>,
  isLive: LivePredicate,
  systemSize: number,
) {
  const call = (predicate: LivePredicate) => {
    const local = new Map<UniformKey, Uniform<any>>();
    const args = buildArgs(spec, instance, local, predicate);
    try {
      return { plugin: spec.fn(...(spec.injectSystemSize ? [systemSize, ...args] : args)), local };
    } catch (err) {
      disposeOwnedTextures(local.values());
      throw err;
    }
  };

  let { plugin, local } = call(isLive);
  if (hasNonUniformEntry(plugin)) {
    console.warn(`Plugin "${instance.type}" needs Uniforms for some params - building it with all params live. Flag them uniformOnly in the registry.`);
    disposeOwnedTextures(local.values());
    ({ plugin, local } = call(() => true));
  }
  for (const [key, uniform] of local) uniforms.set(key, uniform);
  return plugin;
}

function buildModifier(instance: ModifierInstance, uniforms: Map<UniformKey, Uniform<any>>, isLive: LivePredicate, systemSize: number) {
  const spec = getPluginSpec(instance.type);
  if (!spec) {
    console.warn(`Unknown plugin type "${instance.type}" - skipped`);
    return null;
  }
  try {
    return buildPlugin(spec, instance, uniforms, isLive, systemSize);
  } catch (err) {
    console.error(`Failed to build plugin "${instance.type}"`, err);
    return null;
  }
}

/** Every exposed param of every enabled modifier, in stack order. */
export function collectExposedParams(config: ParticleSystemConfig): ExposedParam[] {
  const result: ExposedParam[] = [];
  const add = (slot: ModifierSlot, instance: ModifierInstance) => {
    if (!instance.enabled || !instance.exposed) return;
    const spec = getPluginSpec(instance.type);
    for (const param of Object.keys(instance.exposed)) {
      const paramSpec = spec?.params.find((p) => p.name === param);
      if (!paramSpec || !LIVE_KINDS.has(paramSpec.kind)) {
        console.warn(`"${instance.type}.${param}" is marked exposed but isn't a live param - ignored`);
        continue;
      }
      result.push({ name: exposedName(instance, param)!, slot, instanceId: instance.id, modifierType: instance.type, param, kind: paramSpec.kind });
    }
  };
  add('emitter', config.emitter);
  config.spawnModifiers.forEach((m) => add('spawn', m));
  config.updateModifiers.forEach((m) => add('update', m));
  config.renderModifiers.forEach((m) => add('render', m));
  return result;
}

/** Public names used by more than one exposed param. */
export function findDuplicateExposedNames(exposed: ExposedParam[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const e of exposed) (seen.has(e.name) ? duplicates : seen).add(e.name);
  return duplicates;
}

export interface BuildOptions {
  /** ParticleSystem defaults to `visible = false` (consumers flip it once ready, e.g. after an
   *  orchestrated fade-in). Pass true to have it on screen immediately. Default: false. */
  visible?: boolean;
  /** Passed straight to the engine - set false to drive `system.update()` yourself. Default: true. */
  autoUpdate?: boolean;
  /** Make every live-capable param a Uniform, not just the exposed ones - the editor needs this
   *  so its controls can push changes without a rebuild. Default: false, i.e. unexposed
   *  float/vec2/vec3/color params are baked into the shader as constants. */
  allLive?: boolean;
}

export function buildParticleSystem(config: ParticleSystemConfig, options: BuildOptions = {}): BuiltSystem {
  const uniforms = new Map<UniformKey, Uniform<any>>();

  const exposed = collectExposedParams(config);
  // The editor flags these as you type; a runtime load must not silently drop one of them.
  const duplicates = findDuplicateExposedNames(exposed);
  if (duplicates.size && !options.allLive) {
    throw new Error(`Duplicate exposed param name(s): ${[...duplicates].join(', ')}`);
  }

  const liveFor = (instance: ModifierInstance): LivePredicate =>
    (paramSpec) => !!options.allLive || !!paramSpec.uniformOnly || instance.exposed?.[paramSpec.name] !== undefined;

  const emitterSpec = getPluginSpec(config.emitter.type);
  if (!emitterSpec) throw new Error(`Unknown emitter type "${config.emitter.type}"`);
  const emitterPlugin: ParticleEmitterPlugin = buildPlugin(emitterSpec, config.emitter, uniforms, liveFor(config.emitter), config.system.size);

  const buildList = (list: ModifierInstance[]) => list
    .filter((m) => m.enabled)
    .map((m) => buildModifier(m, uniforms, liveFor(m), config.system.size))
    .filter(Boolean);

  const spawnPlugins = buildList(config.spawnModifiers) as ParticleEmitterModifierPlugin[];
  const updatePlugins = buildList(config.updateModifiers) as ParticlePlugin[];
  const renderPlugins = buildList(config.renderModifiers) as ParticlePlugin[];

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

  const params: Record<string, Uniform<any>> = {};
  const exposedByName = new Map<string, ExposedParam>();
  for (const e of exposed) {
    const uniform = uniforms.get(uniformKey(e.instanceId, e.param));
    if (!uniform) continue; // plugin failed to build and was skipped
    params[e.name] = uniform;
    exposedByName.set(e.name, e);
  }

  return {
    system,
    uniforms,
    params,
    exposed: [...exposedByName.values()],
    setParam: (name, value) => {
      const e = exposedByName.get(name);
      return e ? applyLiveUpdate(uniforms, e.instanceId, e.param, e.kind, value) : false;
    },
    dispose: () => {
      system.dispose();
      // system.dispose() only frees textures each material tracks as its own
      // (_ownedTextures); plugin-supplied gradient/image textures merged in from here
      // are ours to free.
      disposeOwnedTextures(uniforms.values());
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
