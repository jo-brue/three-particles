import { FloatType, MathUtils, Matrix4, RedFormat, RGBAFormat, Texture, Uniform, Vector2Like, Vector3, Vector3Like } from "three";

const { mapLinear } = MathUtils;
import { handleProp, handleUniformProp } from "~/ParticleSystem/Helpers";
import ParticleDataTexture from "~/ParticleSystem/ParticleDataTexture";
import { ParticleEmitterModifierPlugin, ParticleEmitterPlugin, ParticleProp, ParticleSystemSize, Uniforms } from "~/ParticleSystem/ParticleSystem";
import { convertToFloatingString, convertToVec2String, convertToVec3String, generateFibonacciSpiral, makeid, shuffleArray } from "~/Helpers";

// This file exports two kinds of plugin:
// - Emitters (rectangle, circles, circlesStatic, circle): passed as `props.emitter` to
//   `new ParticleSystem(...)`. Each seeds the particle position/rotation/meta data textures
//   and provides emitterFragFunc, which runs once per particle when it respawns (relAge >= 1.0).
// - "spawn" slot modifiers (everything else): passed as pluginsSpawn. Each modifierFragFunc
//   also runs only on respawn, after the emitter's own emitterFragFunc, and can veto/delay a
//   respawn by resetting `age` (see killAreaPillow, simpleNoise, etc for the pattern).

export function applayMatrix( matrix:Uniform<Matrix4> ):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ matrixUniformVarString, matrixVarString ] = handleUniformProp(matrix, _uniforms, 'matrix', id, 'mat4');

  return {
    
    uniforms: _uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ matrixUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`
      vec4 posTransformed_${ id } = ${ matrixVarString } * vec4( position , 1.0);
      position = posTransformed_${ id }.xyz / posTransformed_${ id }.w;
    `

  }
}

export function curve( curvature:ParticleProp<number> ): ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ curvatureUniformVarString, curvatureVarString ] = handleProp(curvature, _uniforms, 'curvature', id, 'vec3', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:[
      'PI'
    ],

    fragVars:/*glsl*/`
      ${ curvatureUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      position.z += (sqrt(1.0 - pow(uv.x * 2.0 - 1.0, 2.0)) - 1.0) * ${curvatureVarString};

    `

  }
}

export function frame( 
  size:Uniform<number> | number,
  thickness:Uniform<number> | number,
 ):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ sizeUniformVarString, sizeVarString ] = handleProp(size, _uniforms, 'frameSize', id, 'float', convertToFloatingString);
  const [ thicknessUniformVarString, thicknessVarString ] = handleProp(thickness, _uniforms, 'frameThickness', id, 'float', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:['pillow'],

    fragVars:/*glsl*/`
      ${ sizeUniformVarString }
      ${ thicknessUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      vec2 dist_${ id } =  abs( clamp( uv, vec2(.0, .5), vec2(1.0) ) - vec2( .5 ) );
      dist_${ id } *= vec2(.7, 1.0);

      // + .03 is a hotfix for osaka ;–)
      vec2 g1_${ id } = pillow(${ sizeVarString } - .03 , dist_${ id }, .4);
      vec2 g2_${ id } = pillow(${ sizeVarString } + ${ thicknessVarString }  - .03, dist_${ id }, .4);

      float f1_${ id } =  1.0 - g1_${ id }.x * g1_${ id }.y; // the smaller frame
      float f2_${ id } =  g2_${ id }.x * g2_${ id }.y; // the bigger frame


      age = (1.0 - step(.25, f1_${ id } * f2_${ id })) * defaultState.w * 2.0;

    `

  }
}

export function controlTexture( 
  controlTexture: Uniform<Texture>, 
  contrast: Uniform<number> | number
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ controlTextureUniformVarString, controlTextureVarString ] = handleUniformProp(controlTexture, _uniforms, 'controlTexture', id, 'sampler2D');
  const [ contrastUniformVarString, contrastVarString ] = handleProp(contrast, _uniforms, 'contrast', id, 'float', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ controlTextureUniformVarString }
      ${ contrastUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      vec3 tex_${ id } = texture2D( ${ controlTextureVarString }, uv ).rgb;
      // make image bw
      float spawnBool = step( ${ contrastVarString }, (tex_${ id }.x + tex_${ id }.y + tex_${ id }.z) / 3.0 );

      age = (1.0 - spawnBool) * defaultState.w * 2.0 * step(.0, age);

    `

  }
}

export function killAreaPillow( 
  size: ParticleProp<number>
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ sizeUniformVarString, sizeVarString ] = handleProp(size, _uniforms, 'size', id, 'float', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ sizeUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      vec2 dist_${ id } =  abs(uv - vec2(.5));

      // + .03 is a hotfix for osaka ;–)
      vec2 g1_${ id } = pillow(${ sizeVarString } + .03, dist_${ id }, .4);

      age = mix( (1.0 - step( .25, g1_${ id }.x * g1_${ id }.y)), age, step(.0, age) );

    `

  }
}

export function killAreaRound( 
  position: ParticleProp<Vector3>,
  size: ParticleProp<number>,
  invert:boolean = true
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ positionUniformVarString, positionVarString ] = handleProp(position, _uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString ] = handleProp(size, _uniforms, 'size', id, 'float', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ sizeUniformVarString }
      ${ positionUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      age += step(.0, age) * (defaultState.w * 2.0 * (${invert ? '1.0 -' : ''} step( ${ sizeVarString } , distance( ${positionVarString}, position.xyz ))));

    `

  }
}

// Same circular kill-test as killAreaRound above, but against `uv` - the particle's fixed slot
// in the texture grid (in [0,1], the same coordinate sampleFromImageAtSpawn's vPosition.xy is)
// - instead of its spawned world position. Where killAreaRound cuts a hole in *world space*
// (wherever the emitter happens to place particles there), this cuts a hole in *index space*:
// which particle slots are allowed to spawn at all, independent of whatever spatial layout the
// emitter gives those slots. Useful for masking by grid position - e.g. matching the layout an
// image-sampling render modifier reads by index rather than by where particles end up in world.
export function killAreaRoundUV(
  position: ParticleProp<Vector2Like>,
  size: ParticleProp<number>,
  invert:boolean = true
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ positionUniformVarString, positionVarString ] = handleProp(position, _uniforms, 'position', id, 'vec2', convertToVec2String);
  const [ sizeUniformVarString, sizeVarString ] = handleProp(size, _uniforms, 'size', id, 'float', convertToFloatingString);

  return {

    uniforms: _uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ sizeUniformVarString }
      ${ positionUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      age += step(.0, age) * (defaultState.w * 2.0 * (${invert ? '1.0 -' : ''} step( ${ sizeVarString } , distance( ${positionVarString}, uv ))));

    `

  }
}

export function simpleNoise(
  noiseTexture: Uniform<Texture>,
  noiseSpeed: ParticleProp<Vector2Like>,
  noiseScale: ParticleProp<number>,
  pixelate: ParticleProp<number>,
  noiseStrength: ParticleProp<number>,
  contrast: ParticleProp<number>
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ noiseTextureUniformVarString, noiseTextureVarString ] = handleUniformProp(noiseTexture, _uniforms, 'noiseTexture', id, 'sampler2D');
  const [ noiseSpeedUniformVarString, noiseSpeedVarString ] = handleProp(noiseSpeed, _uniforms, 'noiseSpeed', id, 'vec2', convertToVec2String);
  const [ noiseScaleUniformVarString, noiseScaleVarString ] = handleProp(noiseScale, _uniforms, 'noiseScale', id, 'float', convertToFloatingString);
  const [ pixelateUniformVarString, pixelateVarString ] = handleProp(pixelate, _uniforms, 'pixelate', id, 'float', convertToFloatingString);
  const [ noiseStrengthUniformVarString, noiseStrengthVarString ] = handleProp(noiseStrength, _uniforms, 'noiseStrength', id, 'float', convertToFloatingString);
  const [ contrastUniformVarString, contrastVarString ] = handleProp(contrast, _uniforms, 'contrast', id, 'float', convertToFloatingString);

  return {

    uniforms: _uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ noiseSpeedUniformVarString }
      ${ noiseTextureUniformVarString }
      ${ noiseScaleUniformVarString }
      ${ pixelateUniformVarString }
      ${ noiseStrengthUniformVarString }
      ${ contrastUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      // pixelate snaps the sample position to a coarse NxN grid across the particle field
      // before sampling the noise texture, so blocks of neighboring particles share the same
      // spawn decision instead of it varying per-particle - a "pixelated" look.
      float pixelSamples_${ id } = max(1.0, ${ pixelateVarString });
      vec2 pixelUv_${ id } = floor(uv * pixelSamples_${ id }) / pixelSamples_${ id };
      float noise_${ id } = texture2D( ${ noiseTextureVarString }, pixelUv_${ id } + uTime * ${ noiseSpeedVarString } * ${ noiseScaleVarString } ).r * ${ noiseStrengthVarString };
      float spawnBool_${ id } = step( ${ contrastVarString }, noise_${ id } );

      age += (1.0 - spawnBool_${ id }) * defaultState.w * 2.0 * step(.0, age);

    `

  }
}

// Same spawn-gate behavior as simpleNoise, but the sample point orbits a small fixed-radius
// circle around its own uv instead of scrolling linearly across the texture - so the pattern
// visibly animates without ever drifting away in any one direction. noiseSpeed here is the
// orbit's angular speed (radians/sec) rather than a directional velocity, and noiseScale is
// the orbit radius (matching simpleNoise, where it scales the same offset term) - otherwise
// identical to simpleNoise, including pixelate.
export function simpleNoiseInPlace(
  noiseTexture: Uniform<Texture>,
  noiseSpeed: ParticleProp<number>,
  noiseScale: ParticleProp<number>,
  pixelate: ParticleProp<number>,
  noiseStrength: ParticleProp<number>,
  contrast: ParticleProp<number>
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ noiseTextureUniformVarString, noiseTextureVarString ] = handleUniformProp(noiseTexture, _uniforms, 'noiseTexture', id, 'sampler2D');
  const [ noiseSpeedUniformVarString, noiseSpeedVarString ] = handleProp(noiseSpeed, _uniforms, 'noiseSpeed', id, 'float', convertToFloatingString);
  const [ noiseScaleUniformVarString, noiseScaleVarString ] = handleProp(noiseScale, _uniforms, 'noiseScale', id, 'float', convertToFloatingString);
  const [ pixelateUniformVarString, pixelateVarString ] = handleProp(pixelate, _uniforms, 'pixelate', id, 'float', convertToFloatingString);
  const [ noiseStrengthUniformVarString, noiseStrengthVarString ] = handleProp(noiseStrength, _uniforms, 'noiseStrength', id, 'float', convertToFloatingString);
  const [ contrastUniformVarString, contrastVarString ] = handleProp(contrast, _uniforms, 'contrast', id, 'float', convertToFloatingString);

  return {

    uniforms: _uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ noiseSpeedUniformVarString }
      ${ noiseTextureUniformVarString }
      ${ noiseScaleUniformVarString }
      ${ pixelateUniformVarString }
      ${ noiseStrengthUniformVarString }
      ${ contrastUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      float pixelSamples_${ id } = max(1.0, ${ pixelateVarString });
      vec2 pixelUv_${ id } = floor(uv * pixelSamples_${ id }) / pixelSamples_${ id };
      vec2 orbit_${ id } = vec2(cos(uTime * ${ noiseSpeedVarString }), sin(uTime * ${ noiseSpeedVarString })) * ${ noiseScaleVarString };
      float noise_${ id } = texture2D( ${ noiseTextureVarString }, pixelUv_${ id } + orbit_${ id } ).r * ${ noiseStrengthVarString };
      float spawnBool_${ id } = step( ${ contrastVarString }, noise_${ id } );

      age += (1.0 - spawnBool_${ id }) * defaultState.w * 2.0 * step(.0, age);

    `

  }
}

// Same spawn-gate behavior as simpleNoise, but genuinely 3D: no texture at all - the noise
// field's own third axis is driven by uTime, so every point evolves independently and never
// repeats in practice, instead of a 2D pattern scrolling (simpleNoise) or orbiting in a fixed
// loop (simpleNoiseInPlace). noiseScale is the spatial frequency across the particle field,
// noiseSpeed is how fast that field evolves over time.
export function simpleNoise3D(
  noiseSpeed: ParticleProp<number>,
  noiseScale: ParticleProp<number>,
  pixelate: ParticleProp<number>,
  noiseStrength: ParticleProp<number>,
  contrast: ParticleProp<number>
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ noiseSpeedUniformVarString, noiseSpeedVarString ] = handleProp(noiseSpeed, _uniforms, 'noiseSpeed', id, 'float', convertToFloatingString);
  const [ noiseScaleUniformVarString, noiseScaleVarString ] = handleProp(noiseScale, _uniforms, 'noiseScale', id, 'float', convertToFloatingString);
  const [ pixelateUniformVarString, pixelateVarString ] = handleProp(pixelate, _uniforms, 'pixelate', id, 'float', convertToFloatingString);
  const [ noiseStrengthUniformVarString, noiseStrengthVarString ] = handleProp(noiseStrength, _uniforms, 'noiseStrength', id, 'float', convertToFloatingString);
  const [ contrastUniformVarString, contrastVarString ] = handleProp(contrast, _uniforms, 'contrast', id, 'float', convertToFloatingString);

  return {

    uniforms: _uniforms,

    requires:['noise3d'],

    fragVars:/*glsl*/`
      ${ noiseSpeedUniformVarString }
      ${ noiseScaleUniformVarString }
      ${ pixelateUniformVarString }
      ${ noiseStrengthUniformVarString }
      ${ contrastUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      float pixelSamples_${ id } = max(1.0, ${ pixelateVarString });
      vec2 pixelUv_${ id } = floor(uv * pixelSamples_${ id }) / pixelSamples_${ id };
      // snoise3d returns roughly [-1,1] - remap to [0,1] to match simpleNoise's texture-sourced range.
      float noise_${ id } = (snoise3d(vec3(pixelUv_${ id } * ${ noiseScaleVarString }, uTime * ${ noiseSpeedVarString })) * 0.5 + 0.5) * ${ noiseStrengthVarString };
      float spawnBool_${ id } = step( ${ contrastVarString }, noise_${ id } );

      age += (1.0 - spawnBool_${ id }) * defaultState.w * 2.0 * step(.0, age);

    `

  }
}

export function heightOffsetNoise(
  noiseTexture: Uniform<Texture>,
  noiseSpeed: ParticleProp<number>,
  noiseScale: ParticleProp<number>,
  offset: ParticleProp<number>,
  contrast: ParticleProp<number>,
):ParticleEmitterModifierPlugin{

  const id = makeid(4);
  
  const _uniforms:Uniforms = {};

  const [ noiseTextureUniformVarString, noiseTextureVarString ] = handleUniformProp(noiseTexture, _uniforms, 'noiseTexture', id, 'sampler2D');
  const [ noiseSpeedUniformVarString, noiseSpeedVarString ] = handleProp(noiseSpeed, _uniforms, 'noiseSpeed', id, 'float', convertToFloatingString);
  const [ noiseScaleUniformVarString, noiseScaleVarString ] = handleProp(noiseScale, _uniforms, 'noiseScale', id, 'float', convertToFloatingString);
  const [ offsetUniformVarString, offsetVarString ] = handleProp(offset, _uniforms, 'offset', id, 'float', convertToFloatingString);
  const [ contrastUniformVarString, contrastVarString ] = handleProp(contrast, _uniforms, 'contrast', id, 'float', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ noiseSpeedUniformVarString }
      ${ noiseTextureUniformVarString }
      ${ noiseScaleUniformVarString }
      ${ offsetUniformVarString }
      ${ contrastUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      float noise_${ id } = smoothstep( ${ contrastVarString } , 1.0, texture2D( ${ noiseTextureVarString }, position.xz / vec2(100.0) * ${ noiseScaleVarString } + uTime * ${noiseSpeedVarString} ).r ) ; 
    
      position.y += noise_${ id } * ${ offsetVarString };

      
    `

  }
}

export function voronoiAreas( 
  noiseSpeed: ParticleProp<number>,
  noiseScale_1: ParticleProp<number>,
  noiseScale_2: ParticleProp<number>,
  contrast: ParticleProp<number>
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ noiseSpeedUniformVarString, noiseSpeedVarString ] = handleProp(noiseSpeed, _uniforms, 'noiseSpeed', id, 'float', convertToFloatingString);
  const [ noiseScale_1_UniformVarString, noiseScale_1_VarString ] = handleProp(noiseScale_1, _uniforms, 'noiseScale_1', id, 'float', convertToFloatingString);
  const [ noiseScale_2_UniformVarString, noiseScale_2_VarString ] = handleProp(noiseScale_2, _uniforms, 'noiseScale_2', id, 'float', convertToFloatingString);
  const [ contrastUniformVarString, contrastVarString ] = handleProp(contrast, _uniforms, 'contrast', id, 'float', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:[
      'voronoi'      
    ],

    fragVars:/*glsl*/`
      ${ noiseSpeedUniformVarString }
      ${ noiseScale_1_UniformVarString }
      ${ noiseScale_2_UniformVarString }
      ${ contrastUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      float m_dist_1_${ id } = voronoi( position.xz * ${ noiseScale_1_VarString }, uTime * ${ noiseSpeedVarString });
      float m_dist_2_${ id } = voronoi( position.xz * ${ noiseScale_2_VarString }, uTime * ${ noiseSpeedVarString });

      float spawnBool_${ id } = step( ${ contrastVarString }, m_dist_1_${ id } * m_dist_2_${ id } );

      age += (1.0 - spawnBool_${ id }) * defaultState.w * 2.0 * step(.0, age);;

    `

  }
}

export function constantSpawn( ):ParticleEmitterModifierPlugin{


  return {
    
    uniforms: {},

    requires:[],

    fragVars:/*glsl*/``,

    modifierFragFunc:/*glsl*/`
      age = .0;
    `

  }
}

export function constantSpawnArea(
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  
  const uniforms:Uniforms = {};

  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`

      float fac_${id} = clamp(distance(${ positionVarString }, position) / ${ sizeVarString }, .0, 1.0);

      age += step(.9, fac_${id}) * defaultState.w * 2.0 * step(.0, age);

    `

  }
}


export function rectangle( 
  size:ParticleSystemSize, 
  lifeMinMax:[number, number] = [.3, 1.5], 
  transform?:Matrix4, 
  randomize = 0 
): ParticleEmitterPlugin {

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const positionsImage = new Float32Array(size * size * 4);
  let i4 = 0;
  let _i =0;

  for (let _y = 0; _y < size; _y++) {
    for (let _x = 0; _x < size; _x++) {

      i4 = _i * 4;

      positionsImage[i4] =  _x / size - .5 + ( Math.random() - .5 ) / size * randomize;
      positionsImage[i4 + 1] =  _y / size - .5 + ( Math.random() - .5 ) / size * randomize;
      positionsImage[i4 + 2 ] =  0;
      positionsImage[i4 + 3 ] =  mapLinear(Math.random(), 0, 1, lifeMinMax[0], lifeMinMax[1]) ;

      if( transform ){

        const [_tX, _tY, _tZ] = new Vector3(positionsImage[ i4 ], positionsImage[ i4 + 1 ], positionsImage[i4 + 2 ]).applyMatrix4(transform)
        positionsImage[i4] = _tX;
        positionsImage[i4 + 1] =  _tY;
        positionsImage[i4 + 2 ] =  _tZ;

      } 

      _i++;

    }
  }

  const positionTextureImage = new ParticleDataTexture('Particles: Data: Rectangle',positionsImage, size, size, RGBAFormat, FloatType);


  return {
    
    uniforms,

    requires:[],

    size,

    emitter: positionTextureImage,

    emitterFragFunc:/*glsl*/`
      position = defaultState.xyz;
    `

  }
}

export function limit(
  size:ParticleProp<number>, 
  center:ParticleProp<Vector3Like>
):ParticleEmitterModifierPlugin{

  const id = makeid(4);

  
  const uniforms:Uniforms = {};

  
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ centerUniformVarString, centerVarString] = handleProp(center, uniforms, 'center', id, 'vec3', convertToVec3String);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ sizeUniformVarString }
      ${ centerUniformVarString }
    `,

    modifierFragFunc:/*glsl*/`
      float fac_${id} = min(1.0 / (distance(${centerVarString}, position) / ${sizeVarString} ), 1.0);
      position.x *= fac_${id};
      position.z *= fac_${id};

    `

  }
}

export function circles( 
  size: ParticleSystemSize, 
  circles:{count:number, radius:number | [ [number,number], [number, number, number, number] ], 
  center:ParticleProp<Vector3Like>}[], 
  lifeMinMax:[number, number] = [.3, 1.5], 
  transform?:Matrix4, 
  randomize = 0 
): ParticleEmitterPlugin {

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const positions = new Float32Array( size * size * 4);
  const circleIds = new Float32Array( size * size );

  const autoSizeCircles = circles.filter(c => c.count == -1);
  const remainingCount = (size * size) - circles.filter( c => c.count > 0).reduce( (count, circle)=>count+= circle.count, 0)

  autoSizeCircles.forEach( c => c.count = remainingCount / autoSizeCircles.length);

  let _positionsIndex = 0;
  let _circleIdIndex = 0;

  circles.forEach( (c, circleId) => {

    const _pos = generateFibonacciSpiral( c.count, c.radius, randomize);

    for (let i = 0; i < _pos.length; i++) {
      
      circleIds[_circleIdIndex] = circleId;

      _circleIdIndex++;
      
      transform && (_pos[i] = new Vector3().copy(_pos[i]).applyMatrix4(transform)) 
      
      positions[_positionsIndex] = _pos[i].x;
      _positionsIndex++;
      positions[_positionsIndex] = _pos[i].y;
      _positionsIndex++;
      positions[_positionsIndex] = _pos[i].z;
      _positionsIndex++;
      positions[_positionsIndex] = mapLinear(Math.random(), 0, 1, lifeMinMax[0], lifeMinMax[1]);
      _positionsIndex++;
      
    }

  })

  const positionTextureImage = new ParticleDataTexture('Particles: Data: Circles', positions, size, size, RGBAFormat, FloatType);

  const metaData = new ParticleDataTexture('Particles: Meta: Circles', circleIds, size, size, RedFormat, FloatType);

  const varStrings = circles.map( (c, circleId) => handleProp(c.center, uniforms, 'center', id + '_' + circleId, 'vec3', convertToVec3String) )
  
  return {
    
    uniforms,

    requires:[],

    size: size as ParticleSystemSize,

    metaData,

    emitter: positionTextureImage,

    fragVars: varStrings.reduce( (str, varStr) => str += varStr[0],''),

    emitterFragFunc:`

      position = defaultState.xyz;

      ${
        varStrings.map( (v, circleId) => `


            position += ${ v[1] } * step(defaultMeta.r, ${ convertToFloatingString(circleId) }) * step(${ convertToFloatingString(circleId) }, defaultMeta.r);


          `
        ).join('')
      }

    `

  }
}

export function circlesStatic(
  size: ParticleSystemSize,
  circles: {
    count:number,
    radius:number | [ [number,number], [number, number, number, number] ],
    center:Vector3Like
  }[],
  lifeMinMax:[number, number] = [.3, 1.5],
  transform?:Matrix4,
  randomize = 0
): ParticleEmitterPlugin {

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const positions = new Float32Array( size * size * 4);
  const circleIds = new Float32Array( size * size );
  const rotations = new Float32Array( size * size * 4).fill(0);

  const autoSizeCircles = circles.filter(c => c.count == -1);
  const remainingCount = (size * size) - circles.filter( c => c.count > 0).reduce( (count, circle)=>count+= circle.count, 0)

  autoSizeCircles.forEach( c => c.count = remainingCount / autoSizeCircles.length);

  let _positionsIndex = 0;
  let _circleIdIndex = 0;

  circles.forEach( (c, circleId) => {

    const _pos = generateFibonacciSpiral( c.count, c.radius, randomize);

    for (let i = 0; i < _pos.length; i++) {

      circleIds[_circleIdIndex] = circleId;

      _circleIdIndex++;

      transform && (_pos[i] = new Vector3().copy(_pos[i]).applyMatrix4(transform))

      positions[_positionsIndex] = _pos[i].x + c.center.x;
      rotations[_positionsIndex] = Math.random() * Math.PI * 2;
      _positionsIndex++;
      positions[_positionsIndex] = _pos[i].y + c.center.y;
      rotations[_positionsIndex] = Math.random() * Math.PI * 2;
      _positionsIndex++;
      positions[_positionsIndex] = _pos[i].z + c.center.z;
      rotations[_positionsIndex] = Math.random() * Math.PI * 2;
      _positionsIndex++;
      positions[_positionsIndex] = mapLinear(Math.random(), 0, 1, lifeMinMax[0], lifeMinMax[1]);
      _positionsIndex++;

    }

  })

  const positionTextureImage = new ParticleDataTexture('Particles: Data: Circles', positions, size, size, RGBAFormat, FloatType);
  const rotationTextureImage = new ParticleDataTexture('Particles: Data: Circles', rotations, size, size, RGBAFormat, FloatType);
  const metaData = new ParticleDataTexture('Particles: Meta: Circles', circleIds, size, size, RedFormat, FloatType);

  const varStrings = circles.map( (c, circleId) => handleProp(c.center, uniforms, 'center', id + '_' + circleId, 'vec3', convertToVec3String) )

  return {

    uniforms,

    requires:[],

    size: size as ParticleSystemSize,

    metaData,

    rotation: rotationTextureImage,

    emitter: positionTextureImage,

    fragVars: varStrings.reduce( (str, varStr) => str += varStr[0],''),

    emitterFragFunc:`

      position = defaultState.xyz;

    `

  }
}

// Local-space points evenly spaced along a straight segment through the origin (local X axis,
// from -length/2 to +length/2), with optional jitter on all three axes so points don't sit on a
// perfectly rigid rail when randomize > 0. Mirrors what generateFibonacciSpiral does for
// circle()/circles() - bake a local shape once, let `transform` orient/position/scale it, and
// (for the multi-shape lines() variant) let a live `center` uniform move it at runtime.
function generateLinePositions(count: number, length: number, randomize: number): Vector3[] {

  const points: Vector3[] = [];

  for (let i = 0; i < count; i++) {

    const t = count > 1 ? i / (count - 1) : 0.5;
    const x = (t - 0.5) * length + (Math.random() - 0.5) * randomize;
    const y = (Math.random() - 0.5) * randomize;
    const z = (Math.random() - 0.5) * randomize;

    points.push(new Vector3(x, y, z));

  }

  return points;

}

export function line(
  size: ParticleSystemSize,
  length: number,
  lifeMinMax: [number, number] = [.3, 1.5],
  transform?: Matrix4,
  randomize = 0
): ParticleEmitterPlugin {

  const uniforms: Uniforms = {};

  const positions = new Float32Array( size * size * 4);
  const rotations = new Float32Array( size * size * 4).fill(0);

  // Same stratified-then-shuffled preheat as circle() - see its comment for why.
  const preheat:number[] = [];
  const preheatStep = 1 / (size * size);

  const _pos = generateLinePositions( size * size, length, randomize);

  let _positionsIndex = 0;

  for (let i = 0; i < _pos.length; i++) {

    transform && (_pos[i] = new Vector3().copy(_pos[i]).applyMatrix4(transform))

    positions[_positionsIndex] = _pos[i].x;
    rotations[_positionsIndex] = Math.random() * Math.PI * 2;
    _positionsIndex++;
    positions[_positionsIndex] = _pos[i].y;
    rotations[_positionsIndex] = Math.random() * Math.PI * 2;
    _positionsIndex++;
    positions[_positionsIndex] = _pos[i].z;
    rotations[_positionsIndex] = Math.random() * Math.PI * 2;
    _positionsIndex++;
    positions[_positionsIndex] = mapLinear(Math.random(), 0, 1, lifeMinMax[0], lifeMinMax[1]);
    _positionsIndex++;
    preheat.push(preheatStep * i);

  }

  shuffleArray(preheat);

  const positionTextureImage = new ParticleDataTexture('Particles: Data: Line', positions, size, size, RGBAFormat, FloatType);
  const rotationTextureImage = new ParticleDataTexture('Particles: RotationData: Line', rotations, size, size, RGBAFormat, FloatType);

  return {

    uniforms,

    requires:[],

    size: size as ParticleSystemSize,

    rotation: rotationTextureImage,

    emitter: positionTextureImage,

    preheat,

    fragVars: '',

    emitterFragFunc:`

      position = defaultState.xyz;

    `

  }
}

// Same idea as circles() but with straight segments instead of spiral discs: total particle
// count is split across the given lines (count: -1 auto-fills whatever's left over), each
// line's own shape (length) is baked once, and each line's `center` is a live Uniform<Vector3>
// (matching circles()'s center) so segments can be moved/animated at runtime without rebuilding
// the emitter's data textures. `transform` orients/positions/scales the whole set of lines
// together, same convention as circle()/circles().
export function lines(
  size: ParticleSystemSize,
  lines: {count:number, length:number, center:ParticleProp<Vector3Like>}[],
  lifeMinMax: [number, number] = [.3, 1.5],
  transform?: Matrix4,
  randomize = 0
): ParticleEmitterPlugin {

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const positions = new Float32Array( size * size * 4);
  const lineIds = new Float32Array( size * size );

  const autoSizeLines = lines.filter(l => l.count == -1);
  const remainingCount = (size * size) - lines.filter( l => l.count > 0).reduce( (count, line)=>count+= line.count, 0)

  autoSizeLines.forEach( l => l.count = remainingCount / autoSizeLines.length);

  let _positionsIndex = 0;
  let _lineIdIndex = 0;

  lines.forEach( (l, lineId) => {

    const _pos = generateLinePositions( l.count, l.length, randomize);

    for (let i = 0; i < _pos.length; i++) {

      lineIds[_lineIdIndex] = lineId;

      _lineIdIndex++;

      transform && (_pos[i] = new Vector3().copy(_pos[i]).applyMatrix4(transform))

      positions[_positionsIndex] = _pos[i].x;
      _positionsIndex++;
      positions[_positionsIndex] = _pos[i].y;
      _positionsIndex++;
      positions[_positionsIndex] = _pos[i].z;
      _positionsIndex++;
      positions[_positionsIndex] = mapLinear(Math.random(), 0, 1, lifeMinMax[0], lifeMinMax[1]);
      _positionsIndex++;

    }

  })

  const positionTextureImage = new ParticleDataTexture('Particles: Data: Lines', positions, size, size, RGBAFormat, FloatType);

  const metaData = new ParticleDataTexture('Particles: Meta: Lines', lineIds, size, size, RedFormat, FloatType);

  const varStrings = lines.map( (l, lineId) => handleProp(l.center, uniforms, 'center', id + '_' + lineId, 'vec3', convertToVec3String) )

  return {

    uniforms,

    requires:[],

    size: size as ParticleSystemSize,

    metaData,

    emitter: positionTextureImage,

    fragVars: varStrings.reduce( (str, varStr) => str += varStr[0],''),

    emitterFragFunc:`

      position = defaultState.xyz;

      ${
        varStrings.map( (v, lineId) => `


            position += ${ v[1] } * step(defaultMeta.r, ${ convertToFloatingString(lineId) }) * step(${ convertToFloatingString(lineId) }, defaultMeta.r);


          `
        ).join('')
      }

    `

  }
}

// Same multi-line split as lines() above, but each line's `center` is baked directly into the
// position data (like circlesStatic() vs circles()) instead of being a live uniform - cheaper
// (no per-line uniform/branch in the shader) but the line can't be moved without rebuilding.
export function linesStatic(
  size: ParticleSystemSize,
  lines: {count:number, length:number, center:Vector3Like}[],
  lifeMinMax: [number, number] = [.3, 1.5],
  transform?: Matrix4,
  randomize = 0
): ParticleEmitterPlugin {

  const uniforms:Uniforms = {};

  const positions = new Float32Array( size * size * 4);
  const rotations = new Float32Array( size * size * 4).fill(0);
  const lineIds = new Float32Array( size * size );

  const autoSizeLines = lines.filter(l => l.count == -1);
  const remainingCount = (size * size) - lines.filter( l => l.count > 0).reduce( (count, line)=>count+= line.count, 0)

  autoSizeLines.forEach( l => l.count = remainingCount / autoSizeLines.length);

  let _positionsIndex = 0;
  let _lineIdIndex = 0;

  lines.forEach( (l, lineId) => {

    const _pos = generateLinePositions( l.count, l.length, randomize);

    for (let i = 0; i < _pos.length; i++) {

      lineIds[_lineIdIndex] = lineId;

      _lineIdIndex++;

      transform && (_pos[i] = new Vector3().copy(_pos[i]).applyMatrix4(transform))

      positions[_positionsIndex] = _pos[i].x + l.center.x;
      rotations[_positionsIndex] = Math.random() * Math.PI * 2;
      _positionsIndex++;
      positions[_positionsIndex] = _pos[i].y + l.center.y;
      rotations[_positionsIndex] = Math.random() * Math.PI * 2;
      _positionsIndex++;
      positions[_positionsIndex] = _pos[i].z + l.center.z;
      rotations[_positionsIndex] = Math.random() * Math.PI * 2;
      _positionsIndex++;
      positions[_positionsIndex] = mapLinear(Math.random(), 0, 1, lifeMinMax[0], lifeMinMax[1]);
      _positionsIndex++;

    }

  })

  const positionTextureImage = new ParticleDataTexture('Particles: Data: Lines', positions, size, size, RGBAFormat, FloatType);
  const rotationTextureImage = new ParticleDataTexture('Particles: Data: Lines', rotations, size, size, RGBAFormat, FloatType);
  const metaData = new ParticleDataTexture('Particles: Meta: Lines', lineIds, size, size, RedFormat, FloatType);

  return {

    uniforms,

    requires:[],

    size: size as ParticleSystemSize,

    metaData,

    rotation: rotationTextureImage,

    emitter: positionTextureImage,

    emitterFragFunc:`

      position = defaultState.xyz;

    `

  }
}

export function circle(
  size: ParticleSystemSize,
  radius:number,
  lifeMinMax:[number, number] = [.3, 1.5],
  transform?:Matrix4,
  randomize = 0
): ParticleEmitterPlugin {

  const id = makeid(4);

  const uniforms:Uniforms = {};

  const positions = new Float32Array( size * size * 4);
  const rotations = new Float32Array( size * size * 4).fill(0);

  let _positionsIndex = 0;

  // A stratified (evenly-stepped, then shuffled) starting phase in [0,1) for each particle -
  // ParticleUpdateMaterial multiplies this by that particle's own randomized life to seed a
  // starting age. Stratified rather than a plain per-particle Math.random() so the initial
  // stagger doesn't clump the way independent random draws can (birthday-paradox gaps),
  // visible as an uneven wave of simultaneous respawns in the first few life cycles.
  const preheat:number[] = [];
  const preheatStep = 1 / (size * size);

  const _pos = generateFibonacciSpiral( size * size, radius, randomize);

  for (let i = 0; i < _pos.length; i++) {

    transform && (_pos[i] = new Vector3().copy(_pos[i]).applyMatrix4(transform))

    positions[_positionsIndex] = _pos[i].x;
    rotations[_positionsIndex] = Math.random() * Math.PI * 2;
    _positionsIndex++;
    positions[_positionsIndex] = _pos[i].y;
    rotations[_positionsIndex] = Math.random() * Math.PI * 2;
    _positionsIndex++;
    positions[_positionsIndex] = _pos[i].z;
    rotations[_positionsIndex] = Math.random() * Math.PI * 2;
    _positionsIndex++;
    positions[_positionsIndex] = mapLinear(Math.random(), 0, 1, lifeMinMax[0], lifeMinMax[1]);
    _positionsIndex++;
    preheat.push(preheatStep * i);

  }

  shuffleArray(preheat);

  const positionTextureImage = new ParticleDataTexture('Particles: Data: Circles', positions, size, size, RGBAFormat, FloatType);
  const rotationTextureImage = new ParticleDataTexture('Particles: RotationData: Circles', rotations, size, size, RGBAFormat, FloatType);

  return {

    uniforms,

    requires:[],

    size: size as ParticleSystemSize,

    rotation: rotationTextureImage,

    emitter: positionTextureImage,

    preheat,

    fragVars: '',

    emitterFragFunc:`

      position = defaultState.xyz;

    `

  }
}