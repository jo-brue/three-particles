import { FloatType, MathUtils, Matrix4, RGBAFormat, Texture, Uniform, Vector3, Vector3Like } from "three";
import { handleProp, handleUniformProp } from "~/ParticleSystem/Helpers";
import { ParticlePlugin, ParticleProp, Uniforms } from "~/ParticleSystem/ParticleSystem";
import { convertToFloatingString, convertToVec3String, makeid } from "~/Helpers";
import ParticleDataTexture from "./ParticleDataTexture";

const { mapLinear } = MathUtils;

// "update" slot plugins: passed as pluginsUpdate to `new ParticleSystem(...)`. Each plugin's
// fragFunc runs once per particle per frame, for particles that are alive (not respawning).
// Available in scope, already declared by ParticleUpdateMaterial:
//   vec2 uv, vec4 state, defaultState, meta, defaultMeta, vec3 rotation, vec4 defaultRotation
//   vec3 position (mutate this), float age, relAge, uTime, uDeltaTime



export function turbulence(curlSize:Uniform<number> | number, speed:Uniform<number> | number):ParticlePlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ curlSizeUniformVarString, curlSizeVarString] = handleProp(curlSize, _uniforms, 'curlSize', id, 'float', convertToFloatingString);
  const [ speedUniformVarString, speedVarString] = handleProp(speed, _uniforms, 'speed', id, 'float', convertToFloatingString);

  return {
    
    uniforms: _uniforms,

    requires:['curl'],

    fragVars:/*glsl*/`
      ${ curlSizeUniformVarString }
      ${ speedUniformVarString }
    `,

    fragFunc:/*glsl*/`
      position += curl(position * ${ curlSizeVarString }, uTime, 0.1 + age * 0.1) * ${speedVarString };
    `

  }
}

export function turbulenceV2(
  curlSize:ParticleProp<number>, 
  speed:ParticleProp<number>,
  strength:ParticleProp<number>,
  modify:ParticleProp<Vector3Like>,
):ParticlePlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ curlSizeUniformVarString, curlSizeVarString] = handleProp(curlSize, _uniforms, 'curlSize', id, 'float', convertToFloatingString);
  const [ speedUniformVarString, speedVarString] = handleProp(speed, _uniforms, 'speed', id, 'float', convertToFloatingString);
  const [ strengthUniformVarString, strengthVarString] = handleProp(strength, _uniforms, 'strength', id, 'float', convertToFloatingString);
  const [ modifyUniformVarString, modifyVarString] = handleProp(modify, _uniforms, 'modify', id, 'vec3', convertToVec3String);

  return {
    
    uniforms: _uniforms,

    requires:['curl'],

    fragVars:/*glsl*/`
      ${ curlSizeUniformVarString }
      ${ speedUniformVarString }
      ${ modifyUniformVarString }
      ${ strengthUniformVarString }
    `,

    fragFunc:/*glsl*/`
      position += curl(position * ${ curlSizeVarString }, uTime * ${speedVarString }, .5) * ${ strengthVarString } * ${ modifyVarString } ;
    `

  }
}

export function transform( transform:Uniform<Matrix4> ):ParticlePlugin{

  const id = makeid(4);

  const _uniforms:Uniforms = {};

  const [ transformUniformVarString, transformVarString ] = handleUniformProp(transform, _uniforms, 'transform', id, 'mat4');

  return {
    
    uniforms: _uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ transformUniformVarString }
    `,

    fragFunc:/*glsl*/`
      vec4 posTransformed_${ id } = ${ transformVarString } * vec4(position, 1.0);
      position = posTransformed_${ id }.xyz / posTransformed_${ id }.w;
    `

  }
}

export function velocity(_vel:Uniform<Vector3Like> | Vector3Like):ParticlePlugin{

  const id = makeid(4);
  const uniforms:Uniforms = {};

  
  const [ velocityUniformVarString, velocityVarString] = handleProp(_vel, uniforms, 'velocity', id, 'vec3', convertToVec3String);
  

  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ velocityUniformVarString }
    `,

    fragFunc:/*glsl*/`
      position += ${velocityVarString} * uDeltaTime;
    `

  }
}

export function velocityOverLife(
  tex:Uniform<Texture>
):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {
    ['tVelocityOverLife_'+id]: tex
  };

  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      uniform sampler2D tVelocityOverLife_${id};
    `,

    fragFunc:/*glsl*/`
      vec3 velocityOl = texture2D(tVelocityOverLife_${id}, vec2(0, vRelAge)).rgb;
      position += uDeltaTime * velocityOl;
    `

  }
}

export function streamVelocityOverLife(
  tex:Uniform<Texture>,
  rotation1:Uniform<Texture>,
  rotation2:Uniform<Texture>,
  speed:ParticleProp<number>
):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {
    ['tStreamVelocityOverLife_'+id]: tex,
    ['tStreamRotation1_'+id]: rotation1,
    ['tStreamRotation2_'+id]: rotation2,
  };

  const [ speedUniformVarString, speedVarString] = handleProp(speed, uniforms, 'speed', id, 'float', convertToFloatingString);

  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      uniform sampler2D tStreamVelocityOverLife_${id};
      uniform sampler2D tStreamRotation1_${id};
      uniform sampler2D tStreamRotation2_${id};
      ${speedUniformVarString}
    `,

    fragFunc:/*glsl*/`
      float velocitySVOL = texture2D(tStreamVelocityOverLife_${id}, vec2(0, relAge)).r;
      vec3 velocityRot1 = texture2D(tStreamRotation1_${id}, vec2(0, relAge)).rgb;
      vec3 velocityRot2 = texture2D(tStreamRotation2_${id}, vec2(0, relAge)).rgb;
      vec3 velocityRot = mix(velocityRot1, velocityRot2, velocitySVOL);
      vec3 dir = mix(vec3(0,1.0,.0), normalize(vec3(position.x, .0, position.z)), velocitySVOL);
      dir = mix(dir, vec3(-.8,.1,0), smoothstep(.6,.9,relAge));
      dir *= mix(vec3(1.0,1.0,1.0), vec3(1.0,-3,1.0), smoothstep(.3,1.0,relAge));
      position += uDeltaTime * dir * ${speedVarString};
      rotation += uDeltaTime * velocityRot * ${speedVarString};
    `

  }
}

export function maskedVelocity(
  velocity:Uniform<Vector3Like> | Vector3Like,
  position:ParticleProp<Vector3Like>, 
  maskSize:ParticleProp<number>,
):ParticlePlugin{

  const id = makeid(4);

  
  const uniforms:Uniforms = {};

  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ maskSizeUniformVarString, maskSizeVarString] = handleProp(maskSize, uniforms, 'maskSize', id, 'float', convertToFloatingString);
  const [ velocityUniformVarString, velocityVarString] = handleProp(velocity, uniforms, 'velocity', id, 'float', convertToVec3String);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ maskSizeUniformVarString }
      ${ velocityUniformVarString }
    `,

    fragFunc:/*glsl*/`

      float fac_${id} = clamp(distance(${ positionVarString }, position) / ${ maskSizeVarString }, .0, 1.0);

      position += ${ velocityVarString } * uDeltaTime * fac_${id};
      
    `

  }
}

export function velocityRing(
  velocity:Uniform<Vector3Like> | Vector3Like,
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
):ParticlePlugin{

  const id = makeid(4);

  
  const uniforms:Uniforms = {};

  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ velocityUniformVarString, velocityVarString] = handleProp(velocity, uniforms, 'velocity', id, 'float', convertToVec3String);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ velocityUniformVarString }
    `,

    fragFunc:/*glsl*/`

      float fac_${id} = smoothstep(.9, 1.0, distance(${ positionVarString }, position) / ${ sizeVarString });

      position += ${ velocityVarString } * uDeltaTime * fac_${id};
      
    `

  }
}

export function velocityArea(
  velocity:Uniform<Vector3Like> | Vector3Like,
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
):ParticlePlugin{

  const id = makeid(4);

  
  const uniforms:Uniforms = {};

  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ velocityUniformVarString, velocityVarString] = handleProp(velocity, uniforms, 'velocity', id, 'float', convertToVec3String);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ velocityUniformVarString }
    `,

    fragFunc:/*glsl*/`

      float fac_${id} = 1.0 - clamp(distance(${ positionVarString }, position) / ${ sizeVarString }, .0, 1.0);

      position += ${ velocityVarString } * uDeltaTime * fac_${id};
      
    `

  }
}

export function velocityAreaVertical(
  velocity:[Vector3Like,Vector3Like] | Vector3Like,
  upperBound:ParticleProp<number>, 
  lowerBound:ParticleProp<number>, 
  softedge:ParticleProp<number>,
  size:number = 0
):ParticlePlugin{

  const id = makeid(4);

  const velocities = new Float32Array( size * size * 4);
  let velocitiesTexture:Uniform<ParticleDataTexture>|undefined = undefined;

  if(Array.isArray(velocity)){
  
    for (let i = 0; i < velocities.length; i+=4) {
      
      velocities[i] = mapLinear(Math.random(), 0, 1, velocity[0].x, velocity[1].x);
      velocities[i+1] = mapLinear(Math.random(), 0, 1, velocity[0].y, velocity[1].y);
      velocities[i+2] = mapLinear(Math.random(), 0, 1, velocity[0].z, velocity[1].z);
      
    }

    velocitiesTexture = new Uniform(new ParticleDataTexture('Particles: Data: Circles', velocities, size, size, RGBAFormat, FloatType));
  }

  

  
  const uniforms:Uniforms = {};

  const [ upperBoundUniformVarString, upperBoundVarString] = handleProp(upperBound, uniforms, 'upperBound', id, 'float', convertToFloatingString);
  const [ lowerBoundUniformVarString, lowerBoundVarString] = handleProp(lowerBound, uniforms, 'lowerBound', id, 'float', convertToFloatingString);
  const [ softedgeUniformVarString, softedgeVarString] = handleProp(softedge, uniforms, 'softedge', id, 'float', convertToFloatingString);
  const [ velocityUniformVarString, velocityVarString] = velocitiesTexture ? 
    handleProp(velocitiesTexture, uniforms, 'velocity', id, 'sampler2D') : 
    handleProp(velocity as Vector3Like, uniforms, 'velocity', id, 'vec3', convertToVec3String)
  ;
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ upperBoundUniformVarString }
      ${ lowerBoundUniformVarString }
      ${ softedgeUniformVarString }
      ${ velocityUniformVarString }
    `,

    fragFunc:/*glsl*/`

      float fac_${id} = smoothstep(${ upperBoundVarString } - ${ softedgeVarString }, ${ upperBoundVarString } + ${ softedgeVarString }, position.y) * 
      (1.0 -  smoothstep(${ lowerBoundVarString } - ${ softedgeVarString }, ${ lowerBoundVarString } + ${ softedgeVarString }, position.y));
    
      vec3 vel_${id} = ${ velocitiesTexture ? `texture2D(${ velocityVarString }, uv).rgb` : velocityVarString } ;

      position += vel_${id} * uDeltaTime * fac_${id};
      
    `

  }
}

export function attractorTopic(
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
  force:ParticleProp<number>,
  weights:ParticleProp<Vector3Like> = {x:1, y:1, z:1},
  offset:ParticleProp<Vector3Like> = {x:0, y:0, z:0},
):ParticlePlugin{

  const id = makeid(4);

  
  const uniforms:Uniforms = {};

  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ weightsUniformVarString, weightsVarString] = handleProp(weights, uniforms, 'weights', id, 'vec3', convertToVec3String);
  const [ offsetUniformVarString, offsetVarString] = handleProp(offset, uniforms, 'offset', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ forceUniformVarString, forceVarString] = handleProp(force, uniforms, 'force', id, 'float', convertToFloatingString);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ forceUniformVarString }
      ${ weightsUniformVarString }
      ${ offsetUniformVarString }
    `,

    fragFunc:/*glsl*/`

      vec3 dir_${id} = (${ positionVarString } + ${ offsetVarString }) - position;
      float fac_${id} = 1.0 - clamp(length(dir_${id}) / ${ sizeVarString }, .0, 1.0);
      dir_${id} = normalize(dir_${id});
      
      dir_${id} *= ${ weightsVarString };

      position += dir_${id} * fac_${id} * uDeltaTime * ${ forceVarString };
      position.y += ${ forceVarString } * 1.5 * uDeltaTime * ( 1.0 - clamp(distance(${ positionVarString }.xz, position.xz) / ${ sizeVarString }, 0.0, 1.0) );

    `

  }
}

export function tornado(
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
  force:ParticleProp<number>,
  swirlForce:ParticleProp<number>,
  offset:ParticleProp<Vector3Like> = {x:0, y:0, z:0},
):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {};
  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ offsetUniformVarString, offsetVarString] = handleProp(offset, uniforms, 'offset', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ forceUniformVarString, forceVarString] = handleProp(force, uniforms, 'force', id, 'float', convertToFloatingString);
  const [ swirlForceUniformVarString, swirlForceVarString] = handleProp(swirlForce, uniforms, 'swirlForce', id, 'float', convertToFloatingString);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ forceUniformVarString }
      ${ swirlForceUniformVarString }
      ${ offsetUniformVarString }
    `,

    fragFunc:/*glsl*/`

      vec3 dir_${id} = (${ positionVarString } + ${ offsetVarString }) - position;
      dir_${id}.y = 0.0; // Ignore vertical difference for swirl force;

      
      // Distance to center (to modulate swirl effect)
      float dist_${id} = length(dir_${id});
      
      float fac_${id} = 1.0 - clamp(dist_${id} / ${ sizeVarString }, .0, 1.0);

      float fac_y_${id} = smoothstep(.7, 1.0, fac_${id});
      float fac_attraction_${id} = smoothstep(.1, .7, fac_${id});
      fac_attraction_${id} *= smoothstep(.0, .6, 1.0 - fac_${id});
      float fac_swirl_${id} = smoothstep(.1, .7, fac_${id});

      // Normalize direction
      vec3 dirNorm_${id} = normalize(dir_${id});

      // Create a perpendicular swirl force
      vec3 swirlForce_${id} = vec3(-dirNorm_${id}.z, 0.0, dirNorm_${id}.x) * ${ swirlForceVarString };
      swirlForce_${id} *= fac_swirl_${id};

      // Attraction toward the center
      vec3 attractionForce_${id} = dirNorm_${id} * ${ forceVarString } * (1.0 / (dist_${id} + 1.0)) ;
      attractionForce_${id} *= fac_attraction_${id} ;

      // Combine all forces
      vec3 velocity_${id} = swirlForce_${id} + attractionForce_${id};

      // velocity_${id} *= fac_${id};

      velocity_${id}.y = fac_y_${ id } * 1.2;
      
      // Apply movement
      position += velocity_${id} * uDeltaTime;

    `

  }
}

export function tornadosimple(
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
  swirlForce:ParticleProp<number>,
  offset:ParticleProp<Vector3Like> = {x:0, y:0, z:0},
):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {};
  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ offsetUniformVarString, offsetVarString] = handleProp(offset, uniforms, 'offset', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ swirlForceUniformVarString, swirlForceVarString] = handleProp(swirlForce, uniforms, 'swirlForce', id, 'float', convertToFloatingString);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ swirlForceUniformVarString }
      ${ offsetUniformVarString }
    `,

    fragFunc:/*glsl*/`

      vec3 dir_${id} = (${ positionVarString } + ${ offsetVarString }) - position;
      dir_${id}.y = 0.0; // Ignore vertical difference for swirl force;

      
      // Distance to center (to modulate swirl effect)
      float dist_${id} = length(dir_${id});
      
      float fac_${id} = 1.0 - clamp(dist_${id} / ${ sizeVarString }, .0, 1.0);

      float fac_y_${id} = smoothstep(.7, 1.0, fac_${id});
      float fac_swirl_${id} = smoothstep(.1, .7, fac_${id});

      // Normalize direction
      vec3 dirNorm_${id} = normalize(dir_${id});

      // Create a perpendicular swirl force
      vec3 swirlForce_${id} = vec3(-dirNorm_${id}.z, 0.0, dirNorm_${id}.x) * ${ swirlForceVarString };
      swirlForce_${id} *= fac_swirl_${id};


      // Combine all forces
      vec3 velocity_${id} = swirlForce_${id} ;

      // velocity_${id} *= fac_${id};

      position += velocity_${id} * uDeltaTime;

    `

  }
}

export function tornadoAreaVertical(
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
  swirlForce:ParticleProp<number>,
  offset:ParticleProp<Vector3Like> = {x:0, y:0, z:0},
  lowerBound:ParticleProp<number>,
  upperBound:ParticleProp<number>,
  softedge:ParticleProp<number>
):ParticlePlugin{

  const id = makeid(4);

  const uniforms:Uniforms = {};
  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ offsetUniformVarString, offsetVarString] = handleProp(offset, uniforms, 'offset', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ swirlForceUniformVarString, swirlForceVarString] = handleProp(swirlForce, uniforms, 'swirlForce', id, 'float', convertToFloatingString);
  const [ lowerBoundUniformVarString, lowerBoundVarString] = handleProp(lowerBound, uniforms, 'lowerBound', id, 'float', convertToFloatingString);
  const [ upperBoundUniformVarString, upperBoundVarString] = handleProp(upperBound, uniforms, 'upperBound', id, 'float', convertToFloatingString);
  const [ softedgeUniformVarString, softedgeVarString] = handleProp(softedge, uniforms, 'softedge', id, 'float', convertToFloatingString);

  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ swirlForceUniformVarString }
      ${ offsetUniformVarString }
      ${ lowerBoundUniformVarString }
      ${ upperBoundUniformVarString }
      ${ softedgeUniformVarString }
    `,

    fragFunc:/*glsl*/`

      vec3 dir_${id} = (${ positionVarString } + ${ offsetVarString }) - position;
      dir_${id}.y = 0.0; // Ignore vertical difference for swirl force;

      
      // Distance to center (to modulate swirl effect)
      float dist_${id} = length(dir_${id});
      
      float fac_${id} = 1.0 - clamp(dist_${id} / ${ sizeVarString }, .0, 1.0);

      float fac_y_${id} = smoothstep(.7, 1.0, fac_${id});
      float fac_swirl_${id} = smoothstep(.1, .7, fac_${id});

      // Normalize direction
      vec3 dirNorm_${id} = normalize(dir_${id});

      // Create a perpendicular swirl force
      vec3 swirlForce_${id} = vec3(-dirNorm_${id}.z, 0.0, dirNorm_${id}.x) * ${ swirlForceVarString };
      swirlForce_${id} *= fac_swirl_${id};


      // Combine all forces
      vec3 velocity_${id} = swirlForce_${id} ;

      velocity_${id} *= smoothstep(${ upperBoundVarString } - ${ softedgeVarString }, ${ upperBoundVarString } + ${ softedgeVarString }, position.y) * 
      (1.0 -  smoothstep(${ lowerBoundVarString } - ${ softedgeVarString }, ${ lowerBoundVarString } + ${ softedgeVarString }, position.y)) ;

      // velocity_${id} *= fac_${id};

      position += velocity_${id} * uDeltaTime;

    `

  }
}

export function attractorMasked(
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
  force:ParticleProp<number>,
  maskSize:ParticleProp<number>,
  weights:ParticleProp<Vector3Like> = {x:1, y:1, z:1},
  offset:ParticleProp<Vector3Like> = {x:0, y:0, z:0},
):ParticlePlugin{

  const id = makeid(4);

  
  const uniforms:Uniforms = {};

  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ weightsUniformVarString, weightsVarString] = handleProp(weights, uniforms, 'weights', id, 'vec3', convertToVec3String);
  const [ offsetUniformVarString, offsetVarString] = handleProp(offset, uniforms, 'offset', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ forceUniformVarString, forceVarString] = handleProp(force, uniforms, 'force', id, 'float', convertToFloatingString);
  const [ maskSizeUniformVarString, maskSizeVarString] = handleProp(maskSize, uniforms, 'maskSize', id, 'float', convertToFloatingString);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ forceUniformVarString }
      ${ maskSizeUniformVarString }
      ${ weightsUniformVarString }
      ${ offsetUniformVarString }
    `,

    fragFunc:/*glsl*/`

      vec3 dir_${id} = (${ positionVarString } + ${ offsetVarString }) - position;
      dir_${id} *= ${ weightsVarString };

      float dist_${id} = length(dir_${id})/ ${ sizeVarString };
      float fac_${id} = 1.0 - clamp( dist_${id}, .0, 1.0);
      dir_${id} = normalize(dir_${id});


      position += dir_${id} * fac_${id} * uDeltaTime * ${ forceVarString } * smoothstep(.02,.1, dist_${id});

    `

  }
}

export function attractor(
  position:ParticleProp<Vector3Like>, 
  size:ParticleProp<number>,
  force:ParticleProp<number>,
  weights:ParticleProp<Vector3Like> = {x:1, y:1, z:1},
  offset:ParticleProp<Vector3Like> = {x:0, y:0, z:0},
  maskSize:ParticleProp<number> = 0,
):ParticlePlugin{

  const id = makeid(4);

  
  const uniforms:Uniforms = {};

  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  const [ weightsUniformVarString, weightsVarString] = handleProp(weights, uniforms, 'weights', id, 'vec3', convertToVec3String);
  const [ offsetUniformVarString, offsetVarString] = handleProp(offset, uniforms, 'offset', id, 'vec3', convertToVec3String);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ forceUniformVarString, forceVarString] = handleProp(force, uniforms, 'force', id, 'float', convertToFloatingString);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
      ${ sizeUniformVarString }
      ${ forceUniformVarString }
      ${ weightsUniformVarString }
      ${ offsetUniformVarString }
    `,

    fragFunc:/*glsl*/`

      vec3 dir_${id} = (${ positionVarString } + ${ offsetVarString }) - position;
      float fac_${id} = 1.0 - clamp(length(dir_${id}) / ${ sizeVarString }, .0, 1.0);
      dir_${id} = normalize(dir_${id});
      
      dir_${id} *= ${ weightsVarString };

      position += dir_${id} * fac_${id} * uDeltaTime * ${ forceVarString };

    `

  }
}

export function floor(
  position:ParticleProp<number>, 
):ParticlePlugin{

  const id = makeid(4);

  
  const uniforms:Uniforms = {};

  
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'float', convertToFloatingString);
  
  return {
    
    uniforms,

    requires:[],

    fragVars:/*glsl*/`
      ${ positionUniformVarString }
    `,

    fragFunc:/*glsl*/`

      position.y = max( ${positionVarString}, position.y);

    `

  }
}



export function turbulenceArea(
  curlSize:Uniform<number> | number, 
  speed:Uniform<number> | number,
  size:Uniform<number> | number,
  position:Uniform<Vector3Like> | Vector3Like,
  minAffection:Uniform<number> | number = 0,
):ParticlePlugin{

  const id = makeid(4);
  const uniforms:Uniforms = {};

  const [ curlSizeUniformVarString, curlSizeVarString] = handleProp(curlSize, uniforms, 'curlSize', id, 'float', convertToFloatingString);
  const [ speedUniformVarString, speedVarString] = handleProp(speed, uniforms, 'speed', id, 'float', convertToFloatingString);
  const [ sizeUniformVarString, sizeVarString] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ minAffectionUniformVarString, minAffectionVarString] = handleProp(minAffection, uniforms, 'minAffection', id, 'float', convertToFloatingString);
  const [ positionUniformVarString, positionVarString] = handleProp(position, uniforms, 'position', id, 'vec3', convertToVec3String);
  

  return {
    
    uniforms,

    requires:['curl'],

    fragVars:/*glsl*/`
      ${ curlSizeUniformVarString }
      ${ speedUniformVarString }
      ${ sizeUniformVarString }
      ${ minAffectionUniformVarString }
      ${ positionUniformVarString }
    `,

    fragFunc:/*glsl*/`
      float affection_${id} = 1.0 - clamp(distance(position, ${ positionVarString }) / ${ sizeVarString }, .0 , 1.0 - ${ minAffectionVarString });
      position += curl(position * ${ curlSizeVarString }, uTime, 0.1 + age * 0.1) * ${ speedVarString } * affection_${id};
    `

  }
}

export function turbulenceAreaVertical(
  curlSize:Uniform<number> | number, 
  speed:Uniform<number> | number,
  strength:Uniform<number> | number,
  upperBound:ParticleProp<number>, 
  lowerBound:ParticleProp<number>, 
  softedge:ParticleProp<number>,
):ParticlePlugin{

  const id = makeid(4);
  const uniforms:Uniforms = {};

  const [ curlSizeUniformVarString, curlSizeVarString] = handleProp(curlSize, uniforms, 'curlSize', id, 'float', convertToFloatingString);
  const [ speedUniformVarString, speedVarString] = handleProp(speed, uniforms, 'speed', id, 'float', convertToFloatingString);
  const [ strengthUniformVarString, strengthVarString] = handleProp(strength, uniforms, 'strength', id, 'float', convertToFloatingString);
  const [ upperBoundUniformVarString, upperBoundVarString] = handleProp(upperBound, uniforms, 'upperBound', id, 'float', convertToFloatingString);
  const [ lowerBoundUniformVarString, lowerBoundVarString] = handleProp(lowerBound, uniforms, 'lowerBound', id, 'float', convertToFloatingString);
  const [ softedgeUniformVarString, softedgeVarString] = handleProp(softedge, uniforms, 'softedge', id, 'float', convertToFloatingString);

  return {
    
    uniforms,

    requires:[
      'curl'
    ],

    fragVars:/*glsl*/`
      ${ curlSizeUniformVarString }
      ${ speedUniformVarString }
      ${ strengthUniformVarString }
      ${ upperBoundUniformVarString }
      ${ lowerBoundUniformVarString }
      ${ softedgeUniformVarString }
    `,

    fragFunc:/*glsl*/`
      float affection_${id} = smoothstep(${ upperBoundVarString } - ${ softedgeVarString }, ${ upperBoundVarString } + ${ softedgeVarString }, position.y) * 
      (1.0 -  smoothstep(${ lowerBoundVarString } - ${ softedgeVarString }, ${ lowerBoundVarString } + ${ softedgeVarString }, position.y)) ;
      position += curl(position * ${ curlSizeVarString } + uTime * ${ speedVarString }, uTime + (uv.x+uv.y) * 10.0, 0.1) * ${ strengthVarString } * affection_${id};
    `

  }
}

export function planeBarrier(
  planeTransform: Uniform<Matrix4>,
  bounciness: ParticleProp<number> = 0.0
): ParticlePlugin {

  const id = makeid(4);
  const uniforms: Uniforms = {};

  const [planeTransformUniformVarString, planeTransformVarString] = handleUniformProp(
    planeTransform, 
    uniforms, 
    'planeTransform', 
    id, 
    'mat4'
  );
  
  const [bouncinessUniformVarString, bouncinessVarString] = handleProp(
    bounciness, 
    uniforms, 
    'bounciness', 
    id, 
    'float', 
    convertToFloatingString
  );

  return {
    uniforms,

    requires: [],

    fragVars: /*glsl*/`
      ${planeTransformUniformVarString}
      ${bouncinessUniformVarString}
    `,

    fragFunc: /*glsl*/`
      // Extract plane normal from transformation matrix (Y-axis in world space)
      vec3 planeNormal_${id} = normalize(${planeTransformVarString}[1].xyz);
      
      // Extract plane position from transformation matrix
      vec3 planePosition_${id} = ${planeTransformVarString}[3].xyz;
      
      // Calculate signed distance from particle to plane
      float distance_${id} = dot(position - planePosition_${id}, planeNormal_${id});
      
      // If particle is below the plane (negative distance), constrain it
      if (distance_${id} < 0.0) {
        // Push particle back to plane surface
        position -= planeNormal_${id} * distance_${id};
        
        // Apply bounciness by reflecting additional distance
        position += planeNormal_${id} * abs(distance_${id}) * ${bouncinessVarString};
      }
    `
  };
}

export function lineRasterAttractor(
  spacing: ParticleProp<number>,
  force: ParticleProp<number>,
  // Which axis/axes snap to the raster, and which way along each: 0 = inactive, +1 = only
  // ever attracts toward the next line in the increasing direction (e.g. {0,1,0} = horizontal
  // lines, particles climb bottom-to-top and are never pulled back down), -1 = decreasing
  // direction only. {1,0,0} = vertical lines (snaps X). Combinable, e.g. {1,0,1} for pillars.
  axis: ParticleProp<Vector3Like> = { x: 1, y: 0, z: 0 },
  origin: ParticleProp<Vector3Like> = { x: 0, y: 0, z: 0 },
  // Distance from a line, along the active axes, over which the pull ramps down to 0 as a
  // particle approaches - this is what makes particles actually collect at a line instead of
  // sweeping through it at constant speed. 0 = no ramp (constant force right up to the line).
  falloffSize: ParticleProp<number> = 0.5,
  // Shape of that ramp: 1 = linear (speed proportional to distance), >1 = stays slow longer and
  // only speeds up near the edge of falloffSize (tighter/crisper collection at the line), <1 =
  // speeds up quickly and only eases off right at the very end (softer collection).
  falloffStrength: ParticleProp<number> = 1,
): ParticlePlugin {

  const id = makeid(4);
  const uniforms: Uniforms = {};

  const [ spacingUniformVarString, spacingVarString ] = handleProp(spacing, uniforms, 'spacing', id, 'float', convertToFloatingString);
  const [ forceUniformVarString, forceVarString ] = handleProp(force, uniforms, 'force', id, 'float', convertToFloatingString);
  const [ axisUniformVarString, axisVarString ] = handleProp(axis, uniforms, 'axis', id, 'vec3', convertToVec3String);
  const [ originUniformVarString, originVarString ] = handleProp(origin, uniforms, 'origin', id, 'vec3', convertToVec3String);
  const [ falloffSizeUniformVarString, falloffSizeVarString ] = handleProp(falloffSize, uniforms, 'falloffSize', id, 'float', convertToFloatingString);
  const [ falloffStrengthUniformVarString, falloffStrengthVarString ] = handleProp(falloffStrength, uniforms, 'falloffStrength', id, 'float', convertToFloatingString);

  return {

    uniforms,

    requires: [],

    fragVars: /*glsl*/`
      ${spacingUniformVarString}
      ${forceUniformVarString}
      ${axisUniformVarString}
      ${originUniformVarString}
      ${falloffSizeUniformVarString}
      ${falloffStrengthUniformVarString}
    `,

    fragFunc: /*glsl*/`

      // Raster of evenly-spaced parallel lines through origin: pull each masked axis toward
      // a multiple of spacing, leaving unmasked (axis component == 0) axes untouched. Unlike a
      // plain nearest-line snap, the line chosen is always the next one in the direction given
      // by that axis component's sign - ceil() (next one up) for positive, floor() (next one
      // down) for negative - so particles only ever travel one way along that axis, never
      // oscillate back toward a line they've already passed.
      vec3 local_${id} = position - ${originVarString};
      vec3 axisSign_${id} = sign(${axisVarString});
      vec3 t_${id} = local_${id} / ${spacingVarString};
      vec3 targetLine_${id} = ${originVarString} + mix(floor(t_${id}), ceil(t_${id}), step(0.0, axisSign_${id})) * ${spacingVarString};
      vec3 delta_${id} = (targetLine_${id} - position) * abs(${axisVarString});

      // Speed ramps down to 0 as the particle nears its target line (instead of a constant
      // pull) so it actually collects there rather than sweeping through at full speed and
      // immediately re-targeting the next line. falloffSize is the distance that ramp spans;
      // falloffStrength shapes the curve (1 = linear, >1 = stays slow longer, <1 = eases only
      // right at the end).
      float dist_${id} = length(delta_${id});
      float falloffT_${id} = clamp(dist_${id} / max(${falloffSizeVarString}, 0.0001), 0.0, 1.0);
      float speedFac_${id} = pow(falloffT_${id}, max(${falloffStrengthVarString}, 0.0001));

      position += sign(delta_${id}) * speedFac_${id} * ${forceVarString} * uDeltaTime;

    `

  };
}

// Same collection behavior as lineRasterAttractor above (evenly-spaced targets, one-directional
// snapping, falloff ramp so particles settle instead of sweeping through), but the raster is a
// set of concentric rings around `origin` on a chosen 2D `plane` instead of parallel lines.
// `direction` plays the role lineRasterAttractor's per-axis `axis` sign did - +1 only ever
// grows to the next larger ring, -1 only ever shrinks to the next smaller one - but as a single
// scalar, since there's only one radial dimension here rather than three independent axes.
// Unlike lineRasterAttractor, the pull direction isn't axis-aligned (the target ring point is
// wherever the particle's current angle meets the target radius, not a fixed line), so this
// uses a safe-normalized delta (`delta / max(length, epsilon)`) instead of lineRasterAttractor's
// per-axis sign() - sign() would only give a discretized diagonal "staircase" direction here,
// not the true direction toward the target point.
export function circularLineRasterAttractor(
  spacing: ParticleProp<number>,
  force: ParticleProp<number>,
  // +1 = only ever pulled outward to the next larger ring (never back in toward one already
  // passed), -1 = only ever pulled inward to the next smaller ring.
  direction: ParticleProp<number> = 1,
  // Which two axes the rings lie on - the third axis is left untouched, so particles only ever
  // move within this plane, never toward/away from it.
  plane: 'xy' | 'xz' | 'yz' = 'xy',
  origin: ParticleProp<Vector3Like> = { x: 0, y: 0, z: 0 },
  falloffSize: ParticleProp<number> = 0.5,
  falloffStrength: ParticleProp<number> = 1,
): ParticlePlugin {

  const id = makeid(4);
  const uniforms: Uniforms = {};

  const [ spacingUniformVarString, spacingVarString ] = handleProp(spacing, uniforms, 'spacing', id, 'float', convertToFloatingString);
  const [ forceUniformVarString, forceVarString ] = handleProp(force, uniforms, 'force', id, 'float', convertToFloatingString);
  const [ directionUniformVarString, directionVarString ] = handleProp(direction, uniforms, 'direction', id, 'float', convertToFloatingString);
  const [ originUniformVarString, originVarString ] = handleProp(origin, uniforms, 'origin', id, 'vec3', convertToVec3String);
  const [ falloffSizeUniformVarString, falloffSizeVarString ] = handleProp(falloffSize, uniforms, 'falloffSize', id, 'float', convertToFloatingString);
  const [ falloffStrengthUniformVarString, falloffStrengthVarString ] = handleProp(falloffStrength, uniforms, 'falloffStrength', id, 'float', convertToFloatingString);

  return {

    uniforms,

    requires: [],

    fragVars: /*glsl*/`
      ${spacingUniformVarString}
      ${forceUniformVarString}
      ${directionUniformVarString}
      ${originUniformVarString}
      ${falloffSizeUniformVarString}
      ${falloffStrengthUniformVarString}
    `,

    fragFunc: /*glsl*/`

      vec2 local_${id} = (position - ${originVarString}).${plane};
      float radius_${id} = length(local_${id});
      float angle_${id} = atan(local_${id}.y, local_${id}.x);

      float t_${id} = radius_${id} / ${spacingVarString};
      float targetRadius_${id} = mix(floor(t_${id}), ceil(t_${id}), step(0.0, sign(${directionVarString}))) * ${spacingVarString};

      vec3 targetPos_${id} = position;
      targetPos_${id}.${plane} = ${originVarString}.${plane} + vec2(cos(angle_${id}), sin(angle_${id})) * targetRadius_${id};
      vec3 delta_${id} = targetPos_${id} - position;

      // Speed ramps down to 0 as the particle nears its target ring (same idea as
      // lineRasterAttractor) so it actually collects there instead of sweeping through.
      float dist_${id} = length(delta_${id});
      float falloffT_${id} = clamp(dist_${id} / max(${falloffSizeVarString}, 0.0001), 0.0, 1.0);
      float speedFac_${id} = pow(falloffT_${id}, max(${falloffStrengthVarString}, 0.0001));

      position += (delta_${id} / max(dist_${id}, 0.0001)) * speedFac_${id} * ${forceVarString} * uDeltaTime;

    `

  };
}

// Same ring-collection behavior as circularLineRasterAttractor above, but the pull itself is
// additionally masked out near `origin`: particles within `maskSize` of the center feel no
// pull at all, ramping up to full strength over the next `maskFalloff` distance beyond that
// (same clamp-and-ramp idea as falloffSize/falloffStrength above, just gating the whole effect
// by distance-from-center instead of shaping the approach to a target ring). Useful for keeping
// a clear, untouched circle in the middle - e.g. so the rings build up around a subject instead
// of pulling particles that start there.
export function circularLineRasterAttractorMasked(
  spacing: ParticleProp<number>,
  force: ParticleProp<number>,
  // Distance from origin, within the ring plane, inside which the pull is fully suppressed.
  maskSize: ParticleProp<number> = 1,
  // Distance beyond maskSize over which the pull ramps from 0 back up to full strength.
  maskFalloff: ParticleProp<number> = 0.5,
  direction: ParticleProp<number> = 1,
  plane: 'xy' | 'xz' | 'yz' = 'xy',
  origin: ParticleProp<Vector3Like> = { x: 0, y: 0, z: 0 },
  falloffSize: ParticleProp<number> = 0.5,
  falloffStrength: ParticleProp<number> = 1,
): ParticlePlugin {

  const id = makeid(4);
  const uniforms: Uniforms = {};

  const [ spacingUniformVarString, spacingVarString ] = handleProp(spacing, uniforms, 'spacing', id, 'float', convertToFloatingString);
  const [ forceUniformVarString, forceVarString ] = handleProp(force, uniforms, 'force', id, 'float', convertToFloatingString);
  const [ maskSizeUniformVarString, maskSizeVarString ] = handleProp(maskSize, uniforms, 'maskSize', id, 'float', convertToFloatingString);
  const [ maskFalloffUniformVarString, maskFalloffVarString ] = handleProp(maskFalloff, uniforms, 'maskFalloff', id, 'float', convertToFloatingString);
  const [ directionUniformVarString, directionVarString ] = handleProp(direction, uniforms, 'direction', id, 'float', convertToFloatingString);
  const [ originUniformVarString, originVarString ] = handleProp(origin, uniforms, 'origin', id, 'vec3', convertToVec3String);
  const [ falloffSizeUniformVarString, falloffSizeVarString ] = handleProp(falloffSize, uniforms, 'falloffSize', id, 'float', convertToFloatingString);
  const [ falloffStrengthUniformVarString, falloffStrengthVarString ] = handleProp(falloffStrength, uniforms, 'falloffStrength', id, 'float', convertToFloatingString);

  return {

    uniforms,

    requires: [],

    fragVars: /*glsl*/`
      ${spacingUniformVarString}
      ${forceUniformVarString}
      ${maskSizeUniformVarString}
      ${maskFalloffUniformVarString}
      ${directionUniformVarString}
      ${originUniformVarString}
      ${falloffSizeUniformVarString}
      ${falloffStrengthUniformVarString}
    `,

    fragFunc: /*glsl*/`

      vec2 local_${id} = (position - ${originVarString}).${plane};
      float radius_${id} = length(local_${id});
      float angle_${id} = atan(local_${id}.y, local_${id}.x);

      float t_${id} = radius_${id} / ${spacingVarString};
      float targetRadius_${id} = mix(floor(t_${id}), ceil(t_${id}), step(0.0, sign(${directionVarString}))) * ${spacingVarString};

      vec3 targetPos_${id} = position;
      targetPos_${id}.${plane} = ${originVarString}.${plane} + vec2(cos(angle_${id}), sin(angle_${id})) * targetRadius_${id};
      vec3 delta_${id} = targetPos_${id} - position;

      // Speed ramps down to 0 as the particle nears its target ring, same as
      // circularLineRasterAttractor.
      float dist_${id} = length(delta_${id});
      float falloffT_${id} = clamp(dist_${id} / max(${falloffSizeVarString}, 0.0001), 0.0, 1.0);
      float speedFac_${id} = pow(falloffT_${id}, max(${falloffStrengthVarString}, 0.0001));

      // Separately, mask the whole effect out near the center: 0 inside maskSize, ramping
      // linearly to 1 over the next maskFalloff of distance.
      float maskT_${id} = clamp((radius_${id} - ${maskSizeVarString}) / max(${maskFalloffVarString}, 0.0001), 0.0, 1.0);

      position += (delta_${id} / max(dist_${id}, 0.0001)) * speedFac_${id} * ${forceVarString} * maskT_${id} * uDeltaTime;

    `

  };
}

// Chladni figures: the standing-wave interference pattern seen on a vibrating plate covered in
// sand, where grains collect along the pattern's nodal lines (f(x,y) == 0) and keep jittering
// everywhere else. Reproduced here the same way the real plate does it, rather than as a
// deterministic gradient-descent pull: each frame every particle gets a random nudge in the
// plate plane, scaled by abs(f) at its own position - near a nodal line that scale collapses
// to ~0 so the particle settles, off a nodal line it keeps getting reshuffled until it wanders
// onto one. `damping` reshapes that abs(f) scale with a pow() before it's applied (>1 sharpens
// the pattern by freezing near-node particles faster and letting everything else roam almost
// undamped; <1 softens it into a looser, hazier settle).
export function chladni(
  // Mode numbers of the two interfering standing waves. Integers give the classic symmetric
  // Chladni figures; non-integers still work but the nodal lines won't close up cleanly.
  n: ParticleProp<number>,
  m: ParticleProp<number>,
  // Half-extent of the plate in world units - position is normalized by this before the mode
  // numbers are applied, so it sets the spatial frequency of the pattern relative to the scene.
  size: ParticleProp<number>,
  // Overall jitter strength; scales the per-frame random displacement.
  strength: ParticleProp<number>,
  // Exponent reshaping the abs(f) settle scale - see comment above.
  damping: ParticleProp<number> = 1,
  // Which two axes the plate lies on - the third axis is left untouched, so particles only ever
  // move within this plane (same convention as circularLineRasterAttractor's `plane`).
  plane: 'xy' | 'xz' | 'yz' = 'xy',
): ParticlePlugin {

  const id = makeid(4);
  const uniforms: Uniforms = {};

  const [ nUniformVarString, nVarString ] = handleProp(n, uniforms, 'n', id, 'float', convertToFloatingString);
  const [ mUniformVarString, mVarString ] = handleProp(m, uniforms, 'm', id, 'float', convertToFloatingString);
  const [ sizeUniformVarString, sizeVarString ] = handleProp(size, uniforms, 'size', id, 'float', convertToFloatingString);
  const [ strengthUniformVarString, strengthVarString ] = handleProp(strength, uniforms, 'strength', id, 'float', convertToFloatingString);
  const [ dampingUniformVarString, dampingVarString ] = handleProp(damping, uniforms, 'damping', id, 'float', convertToFloatingString);

  return {

    uniforms,

    requires: ['PI', 'randv2'],

    fragVars: /*glsl*/`
      ${nUniformVarString}
      ${mUniformVarString}
      ${sizeUniformVarString}
      ${strengthUniformVarString}
      ${dampingUniformVarString}
    `,

    fragFunc: /*glsl*/`

      vec2 local_${id} = position.${plane} / max(${sizeVarString}, 0.0001);
      float f_${id} =
        sin(${nVarString} * PI * local_${id}.x) * sin(${mVarString} * PI * local_${id}.y) -
        sin(${mVarString} * PI * local_${id}.x) * sin(${nVarString} * PI * local_${id}.y);
      float settleScale_${id} = pow(abs(f_${id}), max(${dampingVarString}, 0.0001));

      vec2 jitter_${id} = vec2(
        randv2(uv * 133.7 + uTime) - 0.5,
        randv2(uv * 133.7 + uTime + 47.3) - 0.5
      );

      position.${plane} += jitter_${id} * settleScale_${id} * ${strengthVarString} * uDeltaTime;

    `

  };
}

// Attracts particles toward a horizontal line at y = lineHeight (local space), while also
// spreading them outward in x away from centerX - the two effects share one proximity ramp,
// applied with opposite direction: far from the line, pull-to-line is at full strength and the
// outward push is zero (so particles head straight for the line first); as distToLine shrinks
// toward 0, pull-to-line decays toward 0 (so it settles instead of oscillating through the line)
// while the outward push grows toward full strength (so particles that have arrived spread out
// along the line instead of stacking at a single point).
export function lineSpreadAttractor(
  lineHeight: ParticleProp<number>,
  force: ParticleProp<number>,
  outwardForce: ParticleProp<number>,
  // Half-width of the empty band left around the line: particles approaching from above settle
  // at lineHeight + gap/2, particles approaching from below settle at lineHeight - gap/2, so the
  // two sides never actually touch at lineHeight itself. 0 = both sides converge on the line.
  gap: ParticleProp<number> = 0,
  // x value the outward push splits around: x > centerX is pushed +x, x < centerX is pushed -x.
  centerX: ParticleProp<number> = 0.5,
  // Distance from the line, along y, over which the pull-to-line/outward-push ramp plays out.
  falloffSize: ParticleProp<number> = 0.5,
  // Shape of that ramp: 1 = linear, >1 = stays at the far-from-line behavior longer and switches
  // over sharply right near the line, <1 = switches over gradually from the start.
  falloffStrength: ParticleProp<number> = 1,
): ParticlePlugin {

  const id = makeid(4);
  const uniforms: Uniforms = {};

  const [ lineHeightUniformVarString, lineHeightVarString ] = handleProp(lineHeight, uniforms, 'lineHeight', id, 'float', convertToFloatingString);
  const [ forceUniformVarString, forceVarString ] = handleProp(force, uniforms, 'force', id, 'float', convertToFloatingString);
  const [ outwardForceUniformVarString, outwardForceVarString ] = handleProp(outwardForce, uniforms, 'outwardForce', id, 'float', convertToFloatingString);
  const [ gapUniformVarString, gapVarString ] = handleProp(gap, uniforms, 'gap', id, 'float', convertToFloatingString);
  const [ centerXUniformVarString, centerXVarString ] = handleProp(centerX, uniforms, 'centerX', id, 'float', convertToFloatingString);
  const [ falloffSizeUniformVarString, falloffSizeVarString ] = handleProp(falloffSize, uniforms, 'falloffSize', id, 'float', convertToFloatingString);
  const [ falloffStrengthUniformVarString, falloffStrengthVarString ] = handleProp(falloffStrength, uniforms, 'falloffStrength', id, 'float', convertToFloatingString);

  return {

    uniforms,

    requires: [],

    fragVars: /*glsl*/`
      ${lineHeightUniformVarString}
      ${forceUniformVarString}
      ${outwardForceUniformVarString}
      ${gapUniformVarString}
      ${centerXUniformVarString}
      ${falloffSizeUniformVarString}
      ${falloffStrengthUniformVarString}
    `,

    fragFunc: /*glsl*/`

      // Distance/ramp are measured against the true line, but the pull target is offset by
      // gap/2 to whichever side the particle is already on, so it comes to rest short of the
      // line instead of on it.
      float distToLine_${id} = abs(position.y - ${lineHeightVarString});
      float t_${id} = clamp(distToLine_${id} / max(${falloffSizeVarString}, 0.0001), 0.0, 1.0);
      float pullFac_${id} = pow(t_${id}, max(${falloffStrengthVarString}, 0.0001));
      float spreadFac_${id} = 1.0 - pullFac_${id};

      float sideY_${id} = sign(position.y - ${lineHeightVarString});
      float targetY_${id} = ${lineHeightVarString} + sideY_${id} * ${gapVarString} * 0.5;

      position.y += sign(targetY_${id} - position.y) * pullFac_${id} * ${forceVarString} * uDeltaTime;
      position.x += sign(position.x - ${centerXVarString}) * spreadFac_${id} * ${outwardForceVarString} * uDeltaTime;

    `

  };
}

// A solid ellipsoid obstacle: particles are never allowed inside it (snapped back onto the
// surface the instant they would be), and while passing near its surface they're pushed
// outward along the surface normal and swept sideways (tornado()'s swirl construction), so
// motion that would otherwise carry a particle through the shape instead curves around it.
// Both effects fade to 0 with distance from the surface (falloffSize/falloffStrength, same
// shape as the other falloff-based plugins), so particles far from the ellipsoid are untouched.
export function ellipsoidDeflector(
  center: ParticleProp<Vector3Like> = { x: 0, y: 0, z: 0 },
  // Semi-axis lengths (rx, ry, rz) - equal components give a sphere, unequal give an ellipsoid.
  radii: ParticleProp<Vector3Like> = { x: 1, y: 1, z: 1 },
  // Outward push strength (along the surface normal) near the surface.
  force: ParticleProp<number> = 1,
  // Tangential "flow around" push strength near the surface.
  swirlForce: ParticleProp<number> = 1,
  // Extra distance beyond the surface, in normalized ellipsoid radii (1.0 = one semi-axis worth
  // of distance), over which both forces ramp down to 0.
  falloffSize: ParticleProp<number> = 0.5,
  // Shape of that ramp: 1 = linear, >1 = stays at full strength longer and drops off sharply
  // near the outer edge of falloffSize, <1 = eases off gradually from the surface outward.
  falloffStrength: ParticleProp<number> = 1,
): ParticlePlugin {

  const id = makeid(4);
  const uniforms: Uniforms = {};

  const [ centerUniformVarString, centerVarString ] = handleProp(center, uniforms, 'center', id, 'vec3', convertToVec3String);
  const [ radiiUniformVarString, radiiVarString ] = handleProp(radii, uniforms, 'radii', id, 'vec3', convertToVec3String);
  const [ forceUniformVarString, forceVarString ] = handleProp(force, uniforms, 'force', id, 'float', convertToFloatingString);
  const [ swirlForceUniformVarString, swirlForceVarString ] = handleProp(swirlForce, uniforms, 'swirlForce', id, 'float', convertToFloatingString);
  const [ falloffSizeUniformVarString, falloffSizeVarString ] = handleProp(falloffSize, uniforms, 'falloffSize', id, 'float', convertToFloatingString);
  const [ falloffStrengthUniformVarString, falloffStrengthVarString ] = handleProp(falloffStrength, uniforms, 'falloffStrength', id, 'float', convertToFloatingString);

  return {

    uniforms,

    requires: [],

    fragVars: /*glsl*/`
      ${centerUniformVarString}
      ${radiiUniformVarString}
      ${forceUniformVarString}
      ${swirlForceUniformVarString}
      ${falloffSizeUniformVarString}
      ${falloffStrengthUniformVarString}
    `,

    fragFunc: /*glsl*/`

      vec3 safeRadii_${id} = max(${radiiVarString}, vec3(0.0001));
      vec3 rel_${id} = position - ${centerVarString};
      vec3 relN_${id} = rel_${id} / safeRadii_${id};
      float distN_${id} = length(relN_${id});

      // Hard constraint: never let a particle end up inside the ellipsoid - snap it back onto
      // the surface if it would be (spawned inside, overshot, or pushed in by another plugin).
      if (distN_${id} < 1.0 && distN_${id} > 0.0001) {
        relN_${id} /= distN_${id};
        position = ${centerVarString} + relN_${id} * safeRadii_${id};
        distN_${id} = 1.0;
      }

      // True ellipsoid surface normal: gradient of (x/rx)^2+(y/ry)^2+(z/rz)^2 is proportional
      // to position/radii^2, i.e. relN/radii.
      vec3 normal_${id} = normalize(relN_${id} / safeRadii_${id});

      // Fades in from 0 far away to full strength right at the surface.
      float t_${id} = clamp((distN_${id} - 1.0) / max(${falloffSizeVarString}, 0.0001), 0.0, 1.0);
      float fac_${id} = pow(1.0 - t_${id}, max(${falloffStrengthVarString}, 0.0001));

      // Tangential sweep around the shape - same perpendicular construction tornado() uses for
      // its swirl, applied here so particles slide around the ellipsoid instead of just
      // bouncing straight off it.
      vec3 tangent_${id} = normalize(vec3(-normal_${id}.z, 0.0, normal_${id}.x) + 0.0001);

      position += normal_${id} * fac_${id} * ${forceVarString} * uDeltaTime;
      position += tangent_${id} * fac_${id} * ${swirlForceVarString} * uDeltaTime;

    `

  };
}