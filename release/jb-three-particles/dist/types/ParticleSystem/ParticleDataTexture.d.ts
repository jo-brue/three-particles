import { DataTexture } from 'three';
export default class ParticleDataTexture extends DataTexture {
    minFilter: 1003;
    magFilter: 1003;
    generateMipmaps: boolean;
    flipY: boolean;
    wrapS: 1001;
    wrapT: 1001;
    constructor(name: string, ...props: ConstructorParameters<typeof DataTexture>);
}
