import { Color, Material, Mesh, Object3D, Vector2Like, Vector3, Vector3Like } from "three";

// Root-level helpers consumed via the `~/Helpers` import used throughout ParticleSystem/*.
// This file lives alongside ParticleSystem/ (not inside it) and is reconstructed to match
// the call sites in the plugin files - see memory.md for the engine's overall shape.

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Short random id appended to GLSL var/uniform names so multiple plugin instances don't collide. */
export function makeid(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return result;
}

/** Formats a JS number as a valid GLSL float literal (always has a decimal point). */
export function convertToFloatingString(val: number): string {
  if (!Number.isFinite(val)) return '0.0';
  const s = val.toString();
  return /[.eE]/.test(s) ? s : `${s}.0`;
}

export function convertToVec2String(v: Vector2Like): string {
  return `vec2(${convertToFloatingString(v.x)}, ${convertToFloatingString(v.y)})`;
}

export function convertToVec3String(v: Vector3Like): string {
  return `vec3(${convertToFloatingString(v.x)}, ${convertToFloatingString(v.y)}, ${convertToFloatingString(v.z)})`;
}

export function convertColorToVec3String(c: Color): string {
  return `vec3(${convertToFloatingString(c.r)}, ${convertToFloatingString(c.g)}, ${convertToFloatingString(c.b)})`;
}

/** Fisher-Yates in-place shuffle. */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sunflower/Fibonacci-spiral point distribution on the XY plane (z = 0), used by the
 * circle/circles emitters. `radius` is either a flat disk radius, or a
 * [[minRadius, maxRadius], [biasExponent, ...]] range for a ring with a radial density bias.
 * `randomize` (0..1ish) jitters angle/radius per point so the spiral isn't perfectly crisp.
 */
export function generateFibonacciSpiral(
  count: number,
  radius: number | [[number, number], [number, number, number, number]],
  randomize = 0
): Vector3[] {
  const n = Math.max(0, Math.round(count));
  const points: Vector3[] = [];
  if (n === 0) return points;

  const isRange = Array.isArray(radius);
  const minR = isRange ? radius[0][0] : 0;
  const maxR = isRange ? radius[0][1] : radius;
  // 0.5 (sqrt) gives uniform areal density (the standard sunflower/Vogel-model radial law,
  // r(i) = R*sqrt(i/n)) - since ring area grows with r, radius has to grow slower than the
  // point index or points bunch up toward the center. 1 (linear) would pack the center far
  // denser than the rim.
  const bias = isRange ? radius[1][0] || 0.5 : 0.5;

  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const r = minR + (maxR - minR) * Math.pow(t, bias);
    const theta = i * GOLDEN_ANGLE;

    const jitterAngle = (Math.random() - 0.5) * randomize * 0.5;
    const jitterRadius = (Math.random() - 0.5) * randomize * (maxR / n);
    const rr = Math.max(0, r + jitterRadius);
    const th = theta + jitterAngle;

    points.push(new Vector3(Math.cos(th) * rr, Math.sin(th) * rr, 0));
  }

  return points;
}

/**
 * Deep-disposes geometries/materials/textures under `obj`. Textures flagged
 * `userData.isGlobal` (e.g. the shared noise texture in ParticleSystem/uniforms.ts) are
 * skipped since they're owned outside the object graph being disposed.
 */
export function fullDisposeObject3D(obj: Object3D): void {
  obj.traverse((child) => {
    const mesh = child as Partial<Mesh>;
    mesh.geometry?.dispose();

    const material = (mesh as any).material as Material | Material[] | undefined;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      disposeMaterial(m);
    }
  });
}

function disposeMaterial(material: Material): void {
  for (const key of Object.keys(material)) {
    const value = (material as any)[key];
    if (value?.isTexture && !value.userData?.isGlobal) {
      value.dispose();
    }
  }
  material.dispose();
}
