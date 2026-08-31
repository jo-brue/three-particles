import { ClampToEdgeWrapping, DataTexture, NearestFilter } from "three";

export default class ParticleDataTexture extends DataTexture {

  override minFilter = NearestFilter;
  override magFilter = NearestFilter;
  override generateMipmaps = false;
  override flipY = false;
  override wrapS = ClampToEdgeWrapping;
  override wrapT = ClampToEdgeWrapping;

  constructor(name:string, ...props: ConstructorParameters<typeof DataTexture>){

    super(...props);

    this.needsUpdate = true;
    this.name = name;

  }
}