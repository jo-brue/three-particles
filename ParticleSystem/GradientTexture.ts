import { CanvasTexture } from "three";

export default class GradientTexture extends CanvasTexture{

  declare source:CanvasTexture['source'] & {data:HTMLCanvasElement};

  private _size = 128;

  override get image(): HTMLCanvasElement {
    return super.image as HTMLCanvasElement;
  }

  override name = 'GradientTexture';

  get pixelData(){ return this.image.getContext('2d')?.getImageData(0,0,1,this._size).data || ([] as number[])}

  constructor(stops:[number, string][], size = 128, name = 'GradientTexture'){

    const _canv = document.createElement('canvas');
    _canv.style.cssText = `
      position:fixed;
      top:0;
      z-index:1000;
      left:0;
      transform: scaleX(2000%);
    `
    // document.body.append(_canv)
    
    super(_canv); 

    this.name = name;

    this._size = size;
    
    const ctx = this.image.getContext('2d')!;

    this.image.width = 1;
    this.image.height = this._size;

    const gradient = ctx.createLinearGradient(0, 0, 0, this._size);

    // Add three color stops
    stops.forEach( st => gradient.addColorStop(...st));

    // Set the fill style and draw a rectangle
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, this._size);

  }

  override dispose(): void {
    this.image.remove();

    super.dispose();
  }

}