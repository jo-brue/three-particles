import { ClampToEdgeWrapping, FloatType, NearestFilter, RGBAFormat, Texture, WebGLRenderTarget } from "three";
import ParticleSource from "~/ParticleSystem/ParticleSource";
import { ParticleSystemSize } from "~/ParticleSystem/ParticleSystem";

export default class ParticleRenderTargets extends ParticleSource<WebGLRenderTarget>{

  constructor( size:ParticleSystemSize, hasMeta:0|1 = 0 ){

    const renderTarget = new WebGLRenderTarget(size, size, {
        format: RGBAFormat,
        type: FloatType,
        wrapS: ClampToEdgeWrapping,
        wrapT: ClampToEdgeWrapping,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
        count: 2 + hasMeta,
    });

    super(renderTarget);

  }

  dispose(){

    this._d.forEach( d => d.dispose());
    
  }

}