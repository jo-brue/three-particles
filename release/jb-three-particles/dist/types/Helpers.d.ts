import { Color, Object3D, Vector2Like, Vector3, Vector3Like } from 'three';
/** Short random id appended to GLSL var/uniform names so multiple plugin instances don't collide. */
export declare function makeid(length: number): string;
/** Formats a JS number as a valid GLSL float literal (always has a decimal point). */
export declare function convertToFloatingString(val: number): string;
export declare function convertToVec2String(v: Vector2Like): string;
export declare function convertToVec3String(v: Vector3Like): string;
export declare function convertColorToVec3String(c: Color): string;
/** Fisher-Yates in-place shuffle. */
export declare function shuffleArray<T>(arr: T[]): T[];
/**
 * Sunflower/Fibonacci-spiral point distribution on the XY plane (z = 0), used by the
 * circle/circles emitters. `radius` is either a flat disk radius, or a
 * [[minRadius, maxRadius], [biasExponent, ...]] range for a ring with a radial density bias.
 * `randomize` (0..1ish) jitters angle/radius per point so the spiral isn't perfectly crisp.
 */
export declare function generateFibonacciSpiral(count: number, radius: number | [[number, number], [number, number, number, number]], randomize?: number): Vector3[];
/**
 * Deep-disposes geometries/materials/textures under `obj`. Textures flagged
 * `userData.isGlobal` (e.g. the shared noise texture in ParticleSystem/uniforms.ts) are
 * skipped since they're owned outside the object graph being disposed.
 */
export declare function fullDisposeObject3D(obj: Object3D): void;
