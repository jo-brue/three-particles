
export default class ParticleSource<T extends { clone:()=>T }> {

  protected _d:[T, T];

  get current(){ return this._d[0] }
  get next(){ return this._d[1] }

  constructor(object:T){

    this._d = [object, object.clone()];

  }

  swap(){

    this._d.reverse();

  }
}