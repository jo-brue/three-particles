import { Color, Matrix4, Texture } from 'three';
export interface Trs {
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
    };
    scale: {
        x: number;
        y: number;
        z: number;
    };
}
export declare const IDENTITY_TRS: Trs;
export declare function buildMatrix4(trs: Trs): Matrix4;
export declare function buildColorGradientTexture(stops: [number, string][]): Texture;
export type ScalarCurvePoint = [number, number, number, number, number, number];
export declare function normalizeScalarPoint(raw: number[]): ScalarCurvePoint;
/** Single-channel (R) lookup texture for scalar-over-life curves (size, velocity magnitude, ...).
 *  Each point may carry cubic-bezier handles (see ScalarCurvePoint) - the piecewise curve is
 *  densely sampled into a (t,v) polyline, then resampled uniformly by t via the same "walk
 *  segments, lerp within the bracketing pair" technique the old plain-linear version used, just
 *  applied to the bezier-sampled points instead of the raw stops - so it degrades gracefully
 *  even if handles push a segment's t briefly non-monotonic. */
export declare function buildScalarGradientTexture(stops: number[][], size?: number): Texture;
/** Unbounded RGB lookup texture for vector-over-life curves (velocityOverLife, ...). */
export declare function buildVec3GradientTexture(stops: [number, {
    x: number;
    y: number;
    z: number;
}][]): Texture;
export declare function buildImageTexture(dataUrl: string | null): Texture;
export declare function colorFromHex(hex: string): Color;
