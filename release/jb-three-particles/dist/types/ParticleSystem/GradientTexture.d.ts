import { CanvasTexture } from 'three';
export default class GradientTexture extends CanvasTexture {
    source: CanvasTexture['source'] & {
        data: HTMLCanvasElement;
    };
    private _size;
    get image(): HTMLCanvasElement;
    name: string;
    get pixelData(): Uint8ClampedArray | number[];
    constructor(stops: [number, string][], size?: number, name?: string);
    dispose(): void;
}
