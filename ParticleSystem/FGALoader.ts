import { Data3DTexture, FileLoader, Loader } from "three";

export default class FGALoader extends Loader{

  load(
    url: string, 
    onLoad?: (data: Data3DTexture) => void, 
    onProgress?: (event: ProgressEvent) => void, 
    onError?: (err: unknown) => void
  ): void {
     new FileLoader().load(
      
      url,

      (data) => {

        if(typeof data != 'string') return onError?.('Data not of type string.');
        
        const _vals = data.split(',').map( s => parseFloat(s));
        const [width, height, depth] = _vals.splice(0,3);
        const lower_bounds = _vals.splice(0,3);
        const upper_bounds = _vals.splice(0,3);

        const _d = new Float32Array(_vals.length);

        for (let i = 0; i < _d.length; i++) {

          _d[i] = _vals[i];
          
        }
        
        const _t = new Data3DTexture(_d, width, height, depth);

        onLoad?.(_t);

      },
      onProgress,
      onError
     )
  }
}