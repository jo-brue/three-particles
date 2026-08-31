import { DataTexture, FloatType, GLSL3, IUniform, RedFormat, ShaderMaterial, Texture, Vector2Like } from "three";
import { mergePluginData } from "~/ParticleSystem/Helpers";
import { ParticlePlugin } from "~/ParticleSystem/ParticleSystem";
import ParticleDataTexture from "./ParticleDataTexture";



export default class ParticleUpdateMaterial extends ShaderMaterial{

  declare uniforms: {
    uDeltaTime: IUniform<number>,
    uTime: IUniform<number>,
    stateTexture: IUniform<Texture>,
    metaTexture: IUniform<Texture>,
    rotationTexture: IUniform<Texture>,
    stateTextureDefault: IUniform<Texture>,
    uResolution: IUniform<Vector2Like>,
  };

  override name = 'ParticleUpdateMaterial';

  // Textures created by (and exclusively owned by) this material - the only ones dispose() may free.
  private _ownedTextures = new Set<Texture>();

  // Largest per-particle life found in the seed texture - sets how many simulated seconds the
  // birth-reveal spreads particles' negative starting ages across (see the age-seeding loop
  // below), scaled by preHeat.
  readonly maxLife: number;

  constructor(
    tex:DataTexture, 
    rotationTex:DataTexture, 
    preHeat = 1,
    metaTex?:DataTexture, 
    plugins:ParticlePlugin[] = [],
    preheat:number[] = []
  ){

    const _pluginDataMerged = mergePluginData(plugins);

    const positions = new Float32Array( tex.image.width * tex.image.height * 4);

    let _maxLife = 0;

    if(tex.image.data?.length){
      for(let i = 3; i < tex.image.data.length; i+=4){
        if (tex.image.data[i] > _maxLife) _maxLife = tex.image.data[i];
      }
    }

    if(tex.image.data?.length){

      for(let i = 0; i < tex.image.data.length; i+=4){

        positions[i] = tex.image.data[i];
        positions[i+1] = tex.image.data[i+1];
        positions[i+2] = tex.image.data[i+2];
        // Seed age as a negative "time until birth" instead of an already-in-progress one, so
        // particles switch on one after another over real playback time (a visible reveal)
        // instead of all appearing pre-settled on the very first frame. preheat[], when an
        // emitter supplies one, is a stratified starting *phase* in [0,1) - spread across
        // [-maxLife*preHeat, 0) (maxLife, not each particle's own life, so every particle's
        // countdown is measured against the same span and finishes within one preHeat-scaled
        // lifetime of real time no matter how short its own life is). While age stays negative
        // the shader below just counts it up toward 0 - no update plugins or respawn logic run,
        // and ParticleRenderMaterial discards it - so it's fully inert and invisible until birth.
        const phase = preheat[i >> 2] !== undefined ? preheat[i >> 2] : Math.random();
        positions[i+3] = -phase * _maxLife * preHeat;
      }

    }

    const _stateTextureInit = new ParticleDataTexture('stateTextureInit', positions, tex.image.width, tex.image.height,
      //@ts-ignore
      tex.format,
      tex.type
    );

    const _defaultMetaTexture = new ParticleDataTexture('metaTextureDefault', new Float32Array(1), 1, 1, RedFormat, FloatType);

    super({

      uniforms:{
        // Owned by this instance so multiple particle systems can run on independent clocks.
        uDeltaTime: { value: 0 },
        uTime: { value: 0 },
        stateTexture: { value: _stateTextureInit },
        stateTextureDefault: { value: tex },
        rotationTexture: { value: rotationTex },
        rotationTextureDefault: { value: rotationTex },
        metaTexture: { value: metaTex || _defaultMetaTexture },
        metaTextureDefault: { value: metaTex || _defaultMetaTexture },
        uResolution:{ value: {x: tex.image.width, y:tex.image.height}},
        ..._pluginDataMerged.uniforms
      },

      glslVersion: GLSL3,

      vertexShader:`

        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,

      fragmentShader:/*glsl*/`
        // fragmentShader.glsl
        uniform sampler2D stateTexture;
        uniform sampler2D stateTextureDefault;
        uniform sampler2D metaTexture;
        uniform sampler2D metaTextureDefault;
        uniform sampler2D rotationTexture;
        uniform sampler2D rotationTextureDefault;
        uniform vec2 uResolution;
        // uniform vec3 uCharacterPos;
        uniform float uDeltaTime;
        uniform float uTime;

        ${_pluginDataMerged.fragVars || ''}

        ${Object.values(_pluginDataMerged.requirements).join('') || ''}

        layout(location = 0) out vec4 gState;  // Particle state (position and age)
        layout(location = 1) out vec4 gRotation;   // Particle rotation angles (x, y, z = cumulative angles in radians)
        layout(location = 2) out vec4 gMeta;   // Particle metadata (e.g., burstSpawned)

        void main() {
            vec2 uv = gl_FragCoord.xy / uResolution.xy;
            vec4 state = texture2D(stateTexture, uv);
            vec4 defaultState = texture2D(stateTextureDefault, uv);
            vec4 meta = texture2D(metaTexture, uv);
            vec4 defaultMeta = texture2D(metaTextureDefault, uv);
            vec3 rotation = texture2D(rotationTexture, uv).rgb;
            vec4 defaultRotation = texture2D(rotationTextureDefault, uv);

            vec3 position = state.xyz;
            float age = state.w;
            float relAge = max(age, 0.0) / defaultState.w;

            // A negative seed age means "not born yet" (see ParticleUpdateMaterial's JS-side
            // comment). The frame it first crosses 0 is that particle's actual birth, so route
            // it through the same emitter/spawn-modifier chain a normal respawn uses below -
            // otherwise an emitter that places particles via a live uniform (lines()/circles()'
            // center, say) would never get applied for a particle's first lifetime, since its
            // baked seed position only carries the emitter's local, un-offset shape.
            bool isBirth = age < 0.0;

            age += uDeltaTime;

            if(relAge >= 1.0 || (isBirth && age >= 0.0)){
              // if age is over, or this is the birth frame - reset/place state

              ${ _pluginDataMerged.emitterFragFuncs || ''}
              ${ _pluginDataMerged.modifierFragFuncs || ''}

            } else {
              
              if(age >= .0){

                ${ _pluginDataMerged.fragFuncs || ''};

              }
              
            }

            gState = vec4(position, age);
            gMeta = vec4(meta);
            gRotation = vec4(rotation,0);
        }
      `
    });

    this.maxLife = _maxLife;

    this._ownedTextures.add(_stateTextureInit);
    if(!metaTex) this._ownedTextures.add(_defaultMetaTexture);

  }

  override dispose(): void {
    super.dispose();

    // stateTexture gets swapped to a render-target texture after the first frame, so we
    // can't rely on walking uniforms - dispose whatever this material actually created.
    for (const tex of this._ownedTextures) tex.dispose();

  }
}




