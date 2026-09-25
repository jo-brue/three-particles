export type ParticleSystemSizeOption = 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024;
export type BlendMode = 'normal' | 'additive' | 'multiply' | 'subtractive';
/** How a param's JSON value gets turned into an argument for the plugin function. */
export type ParamKind = 'float' | 'vec3' | 'vec2' | 'color' | 'matrix4' | 'gradientColor' | 'gradientScalar' | 'gradientVec3' | 'texture' | 'plainFloat' | 'plainBool' | 'plainVec3' | 'lifeRange' | 'matrix4plain' | 'circlesList' | 'linesList' | 'select' | 'json';
/** Kinds that bind into a live THREE.Uniform, so dragging a slider mutates .value in place
 *  instead of rebuilding the ParticleSystem (which would recompile shaders). Only the editor
 *  makes all of them live - at runtime, only params listed in ModifierInstance.exposed are
 *  guaranteed to be uniforms (see BAKEABLE_KINDS). */
export declare const LIVE_KINDS: Set<ParamKind>;
/** LIVE_KINDS whose value can instead be baked into the GLSL source as a literal - the engine's
 *  handleProp() does that whenever it gets a plain value instead of a Uniform. The remaining
 *  live kinds (textures, gradients, matrix4) always stay uniforms: a sampler can't be a
 *  literal, and matrices go through handleUniformProp(), which only takes Uniforms. */
export declare const BAKEABLE_KINDS: Set<ParamKind>;
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
    /** A BAKEABLE_KINDS param whose plugin still passes it through handleUniformProp(), so it
     *  must stay a Uniform even when not exposed. */
    uniformOnly?: boolean;
}
export interface CameraState {
    position: [number, number, number];
    target: [number, number, number];
}
export declare const DEFAULT_CAMERA_STATE: CameraState;
/** The editor viewport's lens - not saved per config, so the loader applies the same values to
 *  make a loaded setup frame exactly as it did in the editor. */
export declare const EDITOR_CAMERA_LENS: {
    readonly fov: 50;
    readonly near: 0.01;
    readonly far: 500;
};
export type ModifierSlot = 'emitter' | 'spawn' | 'update' | 'render';
export interface ModifierInstance {
    id: string;
    type: string;
    enabled: boolean;
    params: Record<string, unknown>;
    /** Params made accessible from outside at runtime: paramName -> public name. An empty name
     *  falls back to defaultExposedName(). Anything not listed here is baked into the shader as
     *  a constant when loaded outside the editor (see BAKEABLE_KINDS). */
    exposed?: Record<string, string>;
}
/** The public name an exposed param gets when the user hasn't named it. */
export declare function defaultExposedName(instanceId: string, paramName: string): string;
export declare function exposedName(instance: ModifierInstance, paramName: string): string | null;
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
export declare function makeInstanceId(): string;
