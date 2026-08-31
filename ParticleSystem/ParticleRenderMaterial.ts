import { IUniform, ShaderMaterial, Texture } from "three";
import { defaultRotations, mergePluginData } from "~/ParticleSystem/Helpers";
import { ParticlePlugin, ParticleRenderMode, ParticleSystemProps } from "~/ParticleSystem/ParticleSystem";
import { uResolution } from "~/ParticleSystem/uniforms";

type uniforms = {
  tStateTexture: IUniform<Texture>,
  tStateTextureDefault: IUniform<Texture>,
  uBaseSize: IUniform<number>,
  uTime: IUniform<number>,
  tMatcap?: IUniform<Texture | null>
}



export default class ParticleRenderMaterial extends ShaderMaterial{

  declare uniforms: uniforms;
  override name = 'ParticleRenderMaterial';

  // Textures created by (and exclusively owned by) this material - the only ones dispose() may free.
  // tStateTexture/tStateTextureDefault/tStateTextureMeta/tMatcap are always owned by the emitter,
  // the render targets, or the caller.
  private _ownedTextures = new Set<Texture>();

  constructor(props:ParticleSystemProps, plugins:ParticlePlugin[] = [], renderMode:ParticleRenderMode = 'billboard'){

    const _pluginDataMerged = mergePluginData(plugins);

    // window.devicePixelRatio && (
    //   props.baseSize = props.baseSize / (window.devicePixelRatio)
    // );

    const _rotationTexture = props.emitter.rotation ?? defaultRotations(props.emitter.size);

    super({

      uniforms:{
        tStateTexture: { value: props.emitter.emitter},
        tStateTextureDefault: { value: props.emitter.emitter},
        tStateTextureMeta: { value: props.emitter.metaData},
        tStateTextureRotation: { value: _rotationTexture},
        uBaseSize: { value: props.baseSize},
        uResolution,
        ...(props.matcapTexture ? { tMatcap: { value: props.matcapTexture } } : {}),
        ..._pluginDataMerged.uniforms,
        // Owned by this instance so multiple particle systems can run on independent clocks;
        // placed after the plugin spread so it wins over any plugin-supplied uTime (e.g. flicker()).
        uTime: { value: 0 },
      },

      ...props.materialProps,

      vertexShader: renderMode === 'billboard' ? /* glsl */`

        uniform sampler2D tStateTexture;
        uniform sampler2D tStateTextureDefault;
        uniform vec2 uResolution;
        uniform float uBaseSize;
        varying float vRelAge;
        varying vec3 vPosition;
        varying vec2 vInstanceId;
        varying vec4 vState;
        varying float vSize;
        ${_pluginDataMerged.vertVars || ''}
        

        void main() {

          vState = texture2D(tStateTexture, position.xy);
          vec4 defaultState = texture2D(tStateTextureDefault, position.xy);

          vRelAge = vState.w / defaultState.w;
          vPosition = position;
          vInstanceId = position.xy;

          // Transform particle position from local to world space
          vec4 _worldPosition = modelMatrix * vec4( vState.xyz , 1.0 );
          vec4 mvPosition = viewMatrix * _worldPosition;

          vSize = ( uBaseSize / - mvPosition.z ) * uResolution.y/800.0;

          ${_pluginDataMerged.vertFuncs || ''}

          gl_PointSize = vSize;
          gl_Position = projectionMatrix * mvPosition;

        }

      ` : /* glsl */`

        uniform sampler2D tStateTexture;
        uniform sampler2D tStateTextureDefault;
        uniform vec2 uResolution;
        uniform float uBaseSize;
        attribute vec2 instanceUV;
        varying float vRelAge;
        varying vec3 vPosition;
        varying vec2 vInstanceId;
        varying vec4 vState;
        varying float vSize;
        varying vec3 vViewNormal;
        ${_pluginDataMerged.vertVars || ''}
        

        void main() {

          vState = texture2D(tStateTexture, instanceUV);
          vec4 defaultState = texture2D(tStateTextureDefault, instanceUV);
          vInstanceId = instanceUV;

          vRelAge = vState.w / defaultState.w;

          // Initialize vSize for plugin modifications
          vSize = uBaseSize * 0.01;

          ${_pluginDataMerged.vertFuncs || ''}

          // Apply vSize (now potentially modified by plugins) to mesh scale
          vec3 scaledPosition = position * vSize;
          
          // Add particle position in local space, then transform to world space
          vec4 _worldPosition = modelMatrix * vec4(scaledPosition + vState.xyz, 1.0);
          vPosition = _worldPosition.xyz;

          vec4 mvPosition = viewMatrix * _worldPosition;

          // Calculate view-space normal for matcap
          vViewNormal = normalize(normalMatrix * normal);

          gl_Position = projectionMatrix * mvPosition;

        }

      `,


      fragmentShader: renderMode === 'billboard' ? /* glsl */ `

        varying float vRelAge;
        varying vec3 vPosition;
        varying vec4 vState;
        varying vec2 vInstanceId;
        varying float vSize;

        ${_pluginDataMerged.fragVars || ''}

        void main() {
            if ( vRelAge < 0.0 || vRelAge >= 1.0 || vSize <= .1) discard;

            vec4 color = vec4(1.0, 1.0, 1.0, 1.0);

            ${_pluginDataMerged.fragFuncs || ''}

            gl_FragColor = color;
        }

      ` : /* glsl */ `

        ${props.matcapTexture ? 'uniform sampler2D tMatcap;' : ''}
        varying float vRelAge;
        varying vec3 vPosition;
        varying vec4 vState;
        varying float vSize;
        varying vec2 vInstanceId;
        varying vec3 vViewNormal;

        ${_pluginDataMerged.fragVars || ''}

        void main() {
            if ( vRelAge < 0.0 || vRelAge >= 1.0 || vSize <= .0001) discard;

            vec4 color = vec4(1.0, 1.0, 1.0, 1.0);

            ${_pluginDataMerged.fragFuncs || ''}

            ${props.matcapTexture ? `
            // Matcap sampling using view-space normal
            vec2 matcapUV = vViewNormal.xy * 0.5 + 0.5;
            vec4 matcapColor = texture2D(tMatcap, matcapUV);
            color.rgb *= matcapColor.rgb;
            ` : ''}

            gl_FragColor = color;
        }

      `
    });

    if(!props.emitter.rotation) this._ownedTextures.add(_rotationTexture);

  }

  override dispose(): void {
    super.dispose();

    for (const tex of this._ownedTextures) tex.dispose();

  }
}