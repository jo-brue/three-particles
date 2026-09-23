import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  Euler,
  FloatType,
  Matrix4,
  NearestFilter,
  Quaternion,
  RedFormat,
  Texture,
  TextureLoader,
  Vector3,
} from 'three';
import GradientTexture from '~/ParticleSystem/GradientTexture';
import { create3DGradientDataTexture } from '~/ParticleSystem/Helpers';

export interface Trs {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // degrees
  scale: { x: number; y: number; z: number };
}

export const IDENTITY_TRS: Trs = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const DEG2RAD = Math.PI / 180;

export function buildMatrix4(trs: Trs): Matrix4 {
  const pos = new Vector3(trs.position.x, trs.position.y, trs.position.z);
  const euler = new Euler(trs.rotation.x * DEG2RAD, trs.rotation.y * DEG2RAD, trs.rotation.z * DEG2RAD);
  const quat = new Quaternion().setFromEuler(euler);
  const scale = new Vector3(trs.scale.x, trs.scale.y, trs.scale.z);
  return new Matrix4().compose(pos, quat, scale);
}

export function buildColorGradientTexture(stops: [number, string][]): Texture {
  const safeStops: [number, string][] = stops.length ? stops : [[0, '#ffffff'], [1, '#ffffff']];
  return new GradientTexture(safeStops, 128, 'gradientColor');
}

// A scalar curve point: [t, v, hiDt, hiDv, hoDt, hoDv]. hiDt/hiDv is the incoming cubic-bezier
// handle's offset from (t,v) (dt normally <= 0), hoDt/hoDv is the outgoing handle's offset (dt
// normally >= 0) - the same "offset from the point" convention GradientColorField/CurveField
// handles use. Older saved scenes only have [t, v] pairs; normalizeScalarPoint fills the missing
// handle fields in as 0, which is a degenerate cubic bezier (p1=p0, p2=p3) - i.e. exactly a
// straight line - reproducing the old plain-linear look exactly, so this is fully backward
// compatible with every existing saved sizeOverLife curve.
export type ScalarCurvePoint = [number, number, number, number, number, number];

export function normalizeScalarPoint(raw: number[]): ScalarCurvePoint {
  return [raw[0] ?? 0, raw[1] ?? 0, raw[2] ?? 0, raw[3] ?? 0, raw[4] ?? 0, raw[5] ?? 0];
}

function sampleCubicBezier1D(p0: ScalarCurvePoint, p3: ScalarCurvePoint, u: number): [number, number] {
  const p1t = p0[0] + p0[4], p1v = p0[1] + p0[5];
  const p2t = p3[0] + p3[2], p2v = p3[1] + p3[3];
  const mt = 1 - u;
  const a = mt * mt * mt, b = 3 * mt * mt * u, c = 3 * mt * u * u, d = u * u * u;
  return [
    a * p0[0] + b * p1t + c * p2t + d * p3[0],
    a * p0[1] + b * p1v + c * p2v + d * p3[1],
  ];
}

const BEZIER_SAMPLES_PER_SEGMENT = 24;

/** Single-channel (R) lookup texture for scalar-over-life curves (size, velocity magnitude, ...).
 *  Each point may carry cubic-bezier handles (see ScalarCurvePoint) - the piecewise curve is
 *  densely sampled into a (t,v) polyline, then resampled uniformly by t via the same "walk
 *  segments, lerp within the bracketing pair" technique the old plain-linear version used, just
 *  applied to the bezier-sampled points instead of the raw stops - so it degrades gracefully
 *  even if handles push a segment's t briefly non-monotonic. */
export function buildScalarGradientTexture(stops: number[][], size = 128): Texture {
  const points = stops.map(normalizeScalarPoint).sort((a, b) => a[0] - b[0]);
  const safe = points.length ? points : [normalizeScalarPoint([0, 1]), normalizeScalarPoint([1, 1])];

  const polyline: [number, number][] = [];
  if (safe.length < 2) {
    polyline.push([0, safe[0][1]], [1, safe[0][1]]);
  } else {
    for (let i = 0; i < safe.length - 1; i++) {
      const p0 = safe[i];
      const p3 = safe[i + 1];
      for (let s = (i === 0 ? 0 : 1); s <= BEZIER_SAMPLES_PER_SEGMENT; s++) {
        polyline.push(sampleCubicBezier1D(p0, p3, s / BEZIER_SAMPLES_PER_SEGMENT));
      }
    }
  }

  const data = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    let idx = 0;
    for (let j = 0; j < polyline.length - 1; j++) {
      if (t >= polyline[j][0] && t <= polyline[j + 1][0]) { idx = j; break; }
      idx = j;
    }
    const [t0, v0] = polyline[idx];
    const [t1, v1] = polyline[Math.min(idx + 1, polyline.length - 1)];
    const range = t1 - t0;
    const localT = range > 0 ? (t - t0) / range : 0;
    data[i] = v0 + (v1 - v0) * localT;
  }

  const tex = new DataTexture(data, 1, size, RedFormat, FloatType);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;
  tex.name = 'gradientScalar';
  return tex;
}

/** Unbounded RGB lookup texture for vector-over-life curves (velocityOverLife, ...). */
export function buildVec3GradientTexture(stops: [number, { x: number; y: number; z: number }][]): Texture {
  const safe = stops.length ? stops : [[0, { x: 0, y: 0, z: 0 }], [1, { x: 0, y: 0, z: 0 }]] as [number, { x: number; y: number; z: number }][];
  const tex = create3DGradientDataTexture(safe, 128, 'gradientVec3');
  return tex;
}

let sharedNoiseTexture: Texture | null = null;
function getFallbackTexture(): Texture {
  if (!sharedNoiseTexture) {
    sharedNoiseTexture = new TextureLoader().load('/assets/textures/noise.png');
    sharedNoiseTexture.userData.isGlobal = true;
  }
  return sharedNoiseTexture;
}

const dataUrlTextureCache = new Map<string, Texture>();

export function buildImageTexture(dataUrl: string | null): Texture {
  if (!dataUrl) return getFallbackTexture();
  const cached = dataUrlTextureCache.get(dataUrl);
  if (cached) return cached;
  const tex = new TextureLoader().load(dataUrl);
  tex.needsUpdate = true;
  dataUrlTextureCache.set(dataUrl, tex);
  return tex;
}

export function colorFromHex(hex: string): Color {
  return new Color(hex);
}
