import { DataTexture, RedFormat, RGBAFormat, FloatType, ClampToEdgeWrapping, NearestFilter, Texture, Color, Uniform, Matrix4, Vector2Like, Vector3Like } from "three";
import GradientTexture from "./GradientTexture";
import { ParticlePlugin, ParticleEmitterPlugin, ParticleEmitterModifierPlugin, ParticleExtensions, ParticleSystemSize, Uniforms } from "~/ParticleSystem/ParticleSystem";
import { Extensions } from "~/ParticleSystem/ParticleSystemExtensions";
import ParticleDataTexture from "~/ParticleSystem/ParticleDataTexture";

export function defaultRotations(size: ParticleSystemSize): ParticleDataTexture {
  return new ParticleDataTexture(
    'Particles: Data: Default Rotations',
    new Float32Array(size * size * 4).fill(0),
    size,
    size,
    RGBAFormat,
    FloatType
  );
}

export function create1DGradientDataTexture(stops: [number, string][], size?: number, name = '1DGradientDataTexture'){
  const _gradient = new GradientTexture(stops, size, 'helper for 1D-Gradient');
  const _gradientData = _gradient.pixelData;
  _gradient.dispose();
      
  const _textureValues = new Float32Array(_gradientData.length / 4);

  for (let i = 0; i < _textureValues.length; i++) {
    
    _textureValues[i] = _gradientData[i * 4] /255;
    
  }

  const _texture = new DataTexture(
    _textureValues, 
    1, 
    _textureValues.length, 
    RedFormat, 
    FloatType,
    undefined,
    ClampToEdgeWrapping,
    ClampToEdgeWrapping,
    NearestFilter,
    NearestFilter
  );
  _texture.needsUpdate = true;
  _texture.generateMipmaps = false;
  _texture.flipY = false;
  _texture.name = name;

  return _texture;

}

export function create3DGradientDataTexture(stops: [number, Vector3Like][], size = 256, name = '3DGradientDataTexture'){
  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a[0] - b[0]);
  
  const _textureValues = new Float32Array(size * 4);

  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    
    // Find the two stops to interpolate between
    let stopIndex = 0;
    for (let j = 0; j < sortedStops.length - 1; j++) {
      if (t >= sortedStops[j][0] && t <= sortedStops[j + 1][0]) {
        stopIndex = j;
        break;
      }
    }
    
    const stop1 = sortedStops[stopIndex];
    const stop2 = sortedStops[Math.min(stopIndex + 1, sortedStops.length - 1)];
    
    // Calculate local interpolation factor
    const range = stop2[0] - stop1[0];
    const localT = range > 0 ? (t - stop1[0]) / range : 0;
    
    // Interpolate between the two vectors
    const v1 = stop1[1];
    const v2 = stop2[1];
    
    _textureValues[i * 4 + 0] = v1.x + (v2.x - v1.x) * localT;
    _textureValues[i * 4 + 1] = v1.y + (v2.y - v1.y) * localT;
    _textureValues[i * 4 + 2] = v1.z + (v2.z - v1.z) * localT;
    _textureValues[i * 4 + 3] = 1.0;
  }

  const _texture = new DataTexture(
    _textureValues,
    1,
    size,
    RGBAFormat,
    FloatType,
    undefined,
    ClampToEdgeWrapping,
    ClampToEdgeWrapping,
    NearestFilter,
    NearestFilter
  );
  _texture.needsUpdate = true;
  _texture.generateMipmaps = false;
  _texture.flipY = false;
  _texture.name = name;

  return _texture;

}

export function mergePluginData(plugins:(ParticlePlugin | ParticleEmitterPlugin | ParticleEmitterModifierPlugin)[]) { 
  
  return plugins.reduce( (u, _p) => {

    const _ext = _p.requires.reduce( (_e, e) =>{ 
      
      _e[e] = Extensions[e];

      return _e;

    }, {} as {[key in ParticleExtensions]:string});

    return {
      uniforms: {
        ...u.uniforms, 
        ..._p.uniforms
      },
      fragVars: u.fragVars + (_p.fragVars || ''),
      fragFuncs: u.fragFuncs + (_p.fragFunc || ''),
      emitterFragFuncs: u.emitterFragFuncs + ('emitterFragFunc' in _p ? _p.emitterFragFunc : ''),
      modifierFragFuncs: u.modifierFragFuncs + ('modifierFragFunc' in _p ? _p.modifierFragFunc : ''),
      vertVars: u.vertVars + (_p.vertVars || ''),
      vertFuncs: u.vertFuncs + (_p.vertFunc || ''),
      requirements:{
        ...u.requirements,
        ..._ext,
      }
    }
  }, {
    uniforms:{}, 
    fragVars:'', 
    fragFuncs:'', 
    emitterFragFuncs:'',
    modifierFragFuncs:'', 
    vertVars:'', 
    vertFuncs:'', 
    requirements:{} as {[key in ParticleExtensions]:string}
  });

}

/**
 * 
 * @param prop 
 * @param uniforms 
 * @param name 
 * @param id 
 * @param type 
 * @param convertFunc 
 * @returns [ propUniformVarString, propVarString ]
 */
export function handleProp<T extends (number | Vector3Like | Vector2Like | Texture | Color)>(
  prop:Uniform<T> | T, 
  uniforms:Uniforms, 
  name:string, 
  id:string,
  type: 'float' | 'vec3' | 'vec2' | 'sampler2D',
  convertFunc: (val:T) => string = () => ''
): [string, string]{

  const isUniform = typeof prop == 'object' && 'value' in prop;
  const uName = `u${name.toUpperCase()}_` + id;
  isUniform && ( uniforms[ uName ] = prop );
  const propUniformVarString =  isUniform ? `uniform ${ type } ${ uName };` : '' ;
  const propVarString = isUniform ? uName : convertFunc(prop);

  return [
    propUniformVarString,
    propVarString
  ]

}

export function handleUniformProp<T extends (Matrix4 | Texture | Color)>(
  prop:Uniform<T>, 
  uniforms:Uniforms, 
  name:string, 
  id:string,
  type:'sampler2D' | 'mat4' | 'vec4' | 'vec3'
){

  const isUniform = true;
  const uName = `u${name.toUpperCase()}_` + id;
  isUniform && ( uniforms[ uName ] = prop );
  const propUniformVarString =  isUniform ? `uniform ${type} ${ uName };` : '' ;
  const propVarString = uName;

  return [
    propUniformVarString,
    propVarString
  ]

}