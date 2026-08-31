import { DataTexture, Mesh, OrthographicCamera, PlaneGeometry, Scene, WebGLRenderer } from "three";
import ParticleRenderTargets from "~/ParticleSystem/ParticleRenderTargets";
import { ParticlePlugin } from "~/ParticleSystem/ParticleSystem";
import ParticleUpdateMaterial from "~/ParticleSystem/ParticleUpdateMaterial";
import { fullDisposeObject3D } from "~/Helpers";



export default class ParticleScene extends Scene{

  private _updateMaterial:ParticleUpdateMaterial;
  private _camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private _geometry = new PlaneGeometry(2,2); // for some reason the plane needs to be 2x2, 1x1 does not work

  private _initialized = false;

  constructor(
    tex:DataTexture,
    rotationTex:DataTexture,
    preHeat = 1,
    metaTex?:DataTexture,
    plugins:ParticlePlugin[] = [],
    preheat:number[] = []
  ){
    super();

    this._updateMaterial = new ParticleUpdateMaterial(tex, rotationTex, preHeat, metaTex, plugins, preheat);

    const quad = new Mesh(this._geometry, this._updateMaterial);
    this.add(quad);

  }

  // Primes both ping-pong targets with the raw seed state (a pure passthrough, uTime/uDeltaTime
  // both 0) so the normal update loop never needs to special-case the first frame. Deliberately
  // NOT a fast-forward through simulated time - ParticleUpdateMaterial seeds each particle with a
  // negative "time until birth" age instead of an already-in-progress one, so the birth reveal
  // (particles switching on one after another, staggered across up to maxLife*preHeat seconds)
  // plays out visibly in real playback time from here, rather than being skipped past invisibly.
  private _initRenderTargets(renderer:WebGLRenderer, renderTargets:ParticleRenderTargets){

    for (let i = 0; i < 2; i++) {

      // Iteration 0 deliberately leaves stateTexture/rotationTexture/metaTexture pointing at
      // the material's constructor-time seed uniforms - renderTargets.current is still
      // uninitialized GPU garbage until the first render below actually writes real data into
      // one of the two ping-pong slots. Iteration 1 chains off that real output.
      if (i > 0) {
        this._updateMaterial.uniforms.stateTexture.value = renderTargets.current.textures[0];
        this._updateMaterial.uniforms.rotationTexture.value = renderTargets.current.textures[1];
        this._updateMaterial.uniforms.metaTexture.value = renderTargets.current.textures[2];
      }
      this._updateMaterial.uniforms.uTime.value = 0;
      this._updateMaterial.uniforms.uDeltaTime.value = 0;

      renderer.setRenderTarget(renderTargets.next);
      renderer.render(this, this._camera);
      renderTargets.swap();
    }

    renderer.setRenderTarget(null);

  }

  update(renderer:WebGLRenderer, renderTargets:ParticleRenderTargets, time:number, deltaTime:number){

    if(!this._initialized){
      this._initRenderTargets(renderer, renderTargets);
      this._initialized = true;
    }

    this._updateMaterial.uniforms.stateTexture.value = renderTargets.current.textures[0];
    this._updateMaterial.uniforms.rotationTexture.value = renderTargets.current.textures[1];
    this._updateMaterial.uniforms.metaTexture.value = renderTargets.current.textures[2];
    this._updateMaterial.uniforms.uTime.value = time;
    this._updateMaterial.uniforms.uDeltaTime.value = deltaTime;

    renderer.setRenderTarget(renderTargets.next);
    renderer.render(this, this._camera);
    renderer.setRenderTarget(null);

  }

  dispose(){

    fullDisposeObject3D(this);

    this._updateMaterial.dispose();

  }
}
