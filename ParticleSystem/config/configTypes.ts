export type ParticleSystemSizeOption = 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024;

export type BlendMode = 'normal' | 'additive' | 'multiply' | 'subtractive';

/** How a param's JSON value gets turned into an argument for the plugin function. */
export type ParamKind =
  | 'float'          // number, wrapped Uniform<number> -> live-tweakable
  | 'vec3'           // {x,y,z}, wrapped Uniform<Vector3> -> live-tweakable
  | 'vec2'           // {x,y}, wrapped Uniform<Vector2> -> live-tweakable
  | 'color'          // '#rrggbb', wrapped Uniform<Color> -> live-tweakable
  | 'matrix4'        // TRS object, wrapped Uniform<Matrix4> -> live-tweakable
  | 'gradientColor'  // {stops:[number,string][]}, wrapped Uniform<Texture> -> live-tweakable
  | 'gradientScalar' // {stops:[t,v,hiDt,hiDv,hoDt,hoDv][]} (bezier handles; old [t,v] pairs still
                      // load fine, see normalizeScalarPoint), wrapped Uniform<Texture> -> live-tweakable
  | 'gradientVec3'   // {stops:[number,{x,y,z}][]}, wrapped Uniform<Texture> -> live-tweakable
  | 'texture'        // {dataUrl:string|null}, wrapped Uniform<Texture> -> live-tweakable
  | 'plainFloat'     // number, raw -> structural (rebuild)
  | 'plainBool'      // boolean, raw -> structural (rebuild)
  | 'plainVec3'      // {x,y,z}, raw -> structural (rebuild)
  | 'lifeRange'      // [number, number], raw -> structural (rebuild)
  | 'matrix4plain'   // TRS object, raw THREE.Matrix4 (not a Uniform) -> structural (rebuild)
  | 'circlesList'    // {count,radius,center}[] -> structural (rebuild)
  | 'linesList'      // {count,length,center}[] -> structural (rebuild)
  | 'select'         // string, raw, one of ParamSpec.options -> structural (rebuild) - the
                      // shader is generated differently per option (e.g. an axis swizzle baked
                      // into GLSL source), so this can't be a live uniform
  | 'json';          // arbitrary passthrough for the generic fallback -> structural (rebuild)

/** Kinds that bind into a live THREE.Uniform, so dragging a slider mutates .value in place
 *  instead of rebuilding the ParticleSystem (which would recompile shaders). */
export const LIVE_KINDS = new Set<ParamKind>([
  'float', 'vec3', 'vec2', 'color', 'matrix4', 'gradientColor', 'gradientScalar', 'gradientVec3', 'texture',
]);

export interface ParamSpec {
  name: string;
  kind: ParamKind;
  default: unknown;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  /** circlesList only: whether each circle's `center` should be Uniform-wrapped (circles()) or plain (circlesStatic()). */
  circlesCenterLive?: boolean;
  /** linesList only: whether each line's `center` should be Uniform-wrapped (lines()) or plain (linesStatic()). */
  linesCenterLive?: boolean;
  /** select only: the fixed choices offered in the dropdown. */
  options?: string[];
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export const DEFAULT_CAMERA_STATE: CameraState = { position: [4, 3, 6], target: [0, 0, 0] };

export type ModifierSlot = 'emitter' | 'spawn' | 'update' | 'render';

export interface ModifierInstance {
  id: string;
  type: string;
  enabled: boolean;
  params: Record<string, unknown>;
}

export interface ParticleSystemConfig {
  version: 1;
  name: string;
  system: {
    size: ParticleSystemSizeOption;
    baseSize: number;
    renderMode: 'billboard' | 'instanced';
    preHeat: number;
    background: string;
    blendMode: BlendMode;
  };
  /** Orbit camera position/target - saved with the setup so loading a preset restores the
   *  view it was authored from, not wherever the viewport last happened to be. */
  camera: CameraState;
  /** Whether the viewport grid/axes helpers are shown - an editor display preference, but
   *  saved per-setup since some setups are easier to judge with them off (e.g. dense/bright ones). */
  showGizmos: boolean;
  emitter: ModifierInstance;
  spawnModifiers: ModifierInstance[];
  updateModifiers: ModifierInstance[];
  renderModifiers: ModifierInstance[];
}

export function makeInstanceId(): string {
  return Math.random().toString(36).slice(2, 10);
}
