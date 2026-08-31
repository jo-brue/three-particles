import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../state/store';
import { buildParticleSystem } from '../engine/buildParticleSystem';

// Keeps the renderer's clear alpha in sync with the Transparent toggle - live, not just at
// screenshot time - so the canvas actually goes transparent (revealing the checkerboard behind
// it, see .viewport-transparent in styles.css) the moment you check the box. Without this, the
// canvas is opaque, the checkerboard never shows through, and there's no feedback that
// Transparent is doing anything until you download a screenshot.
function ClearAlphaController({ transparent }: { transparent: boolean }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.setClearAlpha(transparent ? 0 : 1);
  }, [gl, transparent]);
  return null;
}

// Exposes an imperative screenshot capture through the store's screenshotRef (see store.ts) so
// TopBar - outside the react-three-fiber tree - can trigger a download without a prop/context
// bridge. No transparency handling needed here anymore - the live scene (background mesh
// omitted, clear alpha 0 via ClearAlphaController above) already matches what the Transparent
// toggle asked for, so a straight render + read captures exactly what's on screen.
function ScreenshotBridge() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const screenshotRef = useEditorStore((s) => s.screenshotRef);

  useEffect(() => {
    screenshotRef.current = () => {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');

      const name = useEditorStore.getState().config.name || 'particle-system';
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${name}.png`;
      a.click();
    };
    return () => { screenshotRef.current = null; };
  }, [gl, scene, camera, screenshotRef]);

  return null;
}

function SceneContent() {
  const structureVersion = useEditorStore((s) => s.structureVersion);
  const setBuildError = useEditorStore((s) => s.setBuildError);
  const { scene } = useThree();

  useEffect(() => {
    const config = useEditorStore.getState().config;
    try {
      const built = buildParticleSystem(config);
      scene.add(built.system);
      useEditorStore.getState().builtSystemRef.current = built;
      setBuildError(null);
      return () => {
        scene.remove(built.system);
        built.dispose();
        useEditorStore.getState().builtSystemRef.current = null;
      };
    } catch (err) {
      console.error(err);
      setBuildError((err as Error).message ?? String(err));
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureVersion, scene]);

  return null;
}

export default function Viewport() {
  const background = useEditorStore((s) => s.config.system.background);
  const buildError = useEditorStore((s) => s.buildError);
  const setCameraState = useEditorStore((s) => s.setCameraState);
  const showGizmos = useEditorStore((s) => s.showGizmos);
  const transparentScreenshot = useEditorStore((s) => s.transparentScreenshot);
  const controlsRef = useRef<any>(null);

  // Read once at mount (not reactively) - OrbitControls owns the camera afterward, this is
  // only ever a starting point restored from localStorage.
  const [initialCamera] = useState(() => useEditorStore.getState().cameraState);

  const persistCameraState = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    const pos = controls.object.position;
    const tgt = controls.target;
    setCameraState({ position: [pos.x, pos.y, pos.z], target: [tgt.x, tgt.y, tgt.z] });
  };

  return (
    <div className={`viewport${transparentScreenshot ? ' viewport-transparent' : ''}`}>
      <Canvas
        camera={{ position: initialCamera.position, fov: 50, near: 0.01, far: 500 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      >
        {!transparentScreenshot && <color attach="background" args={[background]} />}
        <ClearAlphaController transparent={transparentScreenshot} />
        {showGizmos && <gridHelper args={[20, 20, '#333844', '#20232c']} />}
        {showGizmos && <axesHelper args={[1.5]} />}
        <SceneContent />
        <ScreenshotBridge />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={initialCamera.target}
          onEnd={persistCameraState}
        />
        {/* Orientation compass stays visible regardless of showGizmos - it's the viewport's
            only way to tell current camera orientation, not a scene decoration. */}
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport axisColors={['#e35b5b', '#6bbf6b', '#5b8ee3']} labelColor="black" />
        </GizmoHelper>
      </Canvas>
      {buildError && <div className="viewport-error">Build error: {buildError}</div>}
    </div>
  );
}
