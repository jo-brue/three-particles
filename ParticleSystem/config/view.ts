import { ACESFilmicToneMapping, Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { EDITOR_CAMERA_LENS, ParticleSystemConfig } from '~/ParticleSystem/config/configTypes';

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

export function resolveView(config: ParticleSystemConfig, transparent = false): ParticleView {
  return {
    camera: {
      position: [...config.camera.position],
      target: [...config.camera.target],
      ...EDITOR_CAMERA_LENS,
    },
    background: transparent ? null : config.system.background,
    renderer: { toneMapping: ACESFilmicToneMapping, maxPixelRatio: 2 },
  };
}

/** Applies a resolved view to the given objects - everything optional. Doesn't add anything to
 *  the scene; loadParticleSystem() does that. */
export function applyView(view: ParticleView, { scene, camera, renderer }: ViewTargets): void {
  if (scene) {
    scene.background = view.background === null ? null : new Color(view.background);
  }

  if (camera) {
    camera.fov = view.camera.fov;
    camera.near = view.camera.near;
    camera.far = view.camera.far;
    camera.position.fromArray(view.camera.position);
    camera.lookAt(...view.camera.target);
    camera.updateProjectionMatrix();
  }

  if (renderer) {
    renderer.toneMapping = view.renderer.toneMapping;
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, view.renderer.maxPixelRatio));
    // three (>= r152) always creates its context with alpha - `alpha: false` only sets the
    // initial clear alpha to 1 - so a zero clear alpha is all transparency needs.
    if (view.background === null) renderer.setClearColor(0x000000, 0);
  }
}
