import { Data3DTexture, Loader } from 'three';
export default class FGALoader extends Loader {
    load(url: string, onLoad?: (data: Data3DTexture) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void): void;
}
