import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { ParticleSystemConfig } from './configTypes';
/** How the setup looked in the editor - resolved from the config, applied by loadParticleSystem()
 *  to whatever scene/camera/renderer you pass it, and returned so you can apply it yourself. */
export interface ParticleView {
    camera: {
        position: [number, number, number];
        target: [number, number, number];
        fov: number;
        near: number;
        far: number;
    };
    /** '#rrggbb', or null when transparent. */
    background: string | null;
    /** The editor viewport renders like react-three-fiber's defaults. */
    renderer: {
        toneMapping: typeof ACESFilmicToneMapping;
        maxPixelRatio: number;
    };
}
export interface ViewTargets {
    /** Gets the particle system added (and removed again on dispose()) and the config's
     *  background color (or none, when `transparent`). */
    scene?: Scene;
    /** Gets the editor's camera position, target (via lookAt), fov, near and far. Aspect is left
     *  alone - that's the canvas's business. If you use OrbitControls, set
     *  `controls.target.fromArray(view.camera.target)` too. */
    camera?: PerspectiveCamera;
    /** Gets the editor's tone mapping and a pixel ratio of min(devicePixelRatio, 2). */
    renderer?: WebGLRenderer;
    /** Show the page behind the canvas instead of the config's background color (clears the
     *  scene background and, if you pass `renderer`, its clear alpha). Default: false. */
    transparent?: boolean;
}
export declare function resolveView(config: ParticleSystemConfig, transparent?: boolean): ParticleView;
/** Applies a resolved view to the given objects - everything optional. Doesn't add anything to
 *  the scene; loadParticleSystem() does that. */
export declare function applyView(view: ParticleView, { scene, camera, renderer }: ViewTargets): void;
