import * as ops from './ops/index.js';
import { view } from './utils/buffer.js';
import * as upng from './codecs/png/upng.js';

export default class framebuffer {
  readonly width: number;
  readonly view: DataView;
  readonly u8: Uint8Array;
  readonly height: number;
  readonly u32: Uint32Array;

  constructor(width: number, height: number, buffer?: BufferSource) {
    this.width = width;
    this.height = height;
    this.u8 = buffer ? view(buffer) : new Uint8Array(4 * width * height);
    this.view = new DataView(this.u8.buffer, this.u8.byteOffset, this.u8.byteLength);
    this.u32 = new Uint32Array(this.u8.buffer, this.u8.byteOffset, this.u8.byteLength / 4);
    if (this.u8.length !== 4 * width * height) throw new Error('invalid capacity of buffer');
  }

  get bitmap() { return this.u8; }
  toString() { return `framebuffer<${this.width}x${this.height}>`; }
  clone(): framebuffer { return new framebuffer(this.width, this.height, this.u8.slice()); }
  toJSON() { return { width: this.width, height: this.height, buffer: Array.from(this.u8) } }
  protected get(x: number, y: number): number { return this.view.getUint32((~~x - 1) + (~~y - 1) * this.width, false); }
  overlay(frame: this, x: number = 0, y: number = 0): this { return (ops.overlay.overlay(this, frame, ~~x, ~~y), this); }
  replace(frame: this, x: number = 0, y: number = 0): this { return (ops.overlay.replace(this, frame, ~~x, ~~y), this); }
  [Symbol.iterator](): Generator<[x: number, y: number], [x: number, y: number]> { return ops.iterator.cords(this) as any; }
  protected set(x: number, y: number, color: number) { this.view.setUint32((~~x - 1) + (~~y - 1) * this.width, color, false); }
  scale(type: 'cubic' | 'linear' | 'nearest', factor: number): this { return this.resize(type, factor * this.width, factor * this.height); }
  protected at(x: number, y: number): Uint8Array { const offset = 4 * ((~~x - 1) + (~~y - 1) * this.width); return this.u8.subarray(offset, 4 + offset); }

  encode(type: 'png'): Uint8Array {
    if (type !== 'png') throw new Error('invalid image type');
    else return upng.encode(this.u8, { channels: 4, width: this.width, height: this.height });
  }

  flip(type: 'vertical' | 'horizontal'): this {
    if (type === 'vertical') ops.flip.vertical(this);
    else if (type === 'horizontal') ops.flip.horizontal(this);

    else throw new TypeError('invalid flip type');

    return this;
  }

  cut(type: 'circle', feathering: number): this;
  cut(type: 'box', x: number, y: number, width: number, height: number): this;
  cut(type: string, arg0: any, arg1?: any, arg2?: any, arg3?: any): this {
    if (type === 'circle') return ops.crop.circle(arg0 || 0, this);
    else if (type === 'box') return ops.crop.cut(~~arg0, ~~arg1, ~~arg2, ~~arg3, this);

    else throw new TypeError('invalid cut type');
  }

  crop(type: 'circle', feathering?: number): this;
  crop(type: 'box', x: number, y: number, width: number, height: number): this;
  crop(type: string, arg0: any, arg1?: any, arg2?: any, arg3?: any): this {
    if (type === 'circle') ops.crop.circle(arg0 || 0, this);
    else if (type === 'box') ops.crop.crop(~~arg0, ~~arg1, ~~arg2, ~~arg3, this);

    else throw new TypeError('invalid crop type');

    return this;
  }

  pixels(type?: 'int'): Generator<[x: number, y: number, color: number], [x: number, y: number, color: number]>;
  pixels(type: 'rgba'): Generator<[x: number, y: number, rgba: Uint8Array], [x: number, y: number, rgba: Uint8Array]>;
  pixels(type?: string): any {
    if ('rgba' === type) return ops.iterator.rgba(this);
    if (!type || 'int' === type) return ops.iterator.u32(this);

    throw new TypeError('invalid iterator type');
  }

  rotate(deg: number, resize: boolean = true): this {
    if (0 === (deg %= 360)) return this;
    else if (90 === deg) ops.rotate.rotate90(this);
    else if (180 === deg) ops.rotate.rotate180(this);
    else if (270 === deg) ops.rotate.rotate270(this);

    else ops.rotate.rotate(deg, this, resize);

    return this;
  }

  resize(type: 'cubic' | 'linear' | 'nearest', width: number, height: number): this {
    if (width === this.width && height === this.height) return this;
    else if (type === 'cubic') ops.resize.cubic(~~width, ~~height, this);
    else if (type === 'linear') ops.resize.linear(~~width, ~~height, this);
    else if (type === 'nearest') ops.resize.nearest(~~width, ~~height, this);

    else throw new TypeError('invalid resize type');

    return this;
  }

  fill(color: number): this;
  fill(cb: (x: number, y: number) => number): this;
  fill(rgba: [number, number, number, number]): this;
  fill(color: any): this {
    const type = typeof color;
    if (type === 'function') ops.fill.fn(color, this);
    else if (type === 'number') ops.fill.color(color, this);
    else if (Array.isArray(color)) ops.fill.color(ops.color.from_rgba(...color), this);

    else throw new TypeError('invalid fill type');

    return this;
  }

  blur(type: 'cubic'): this;
  blur(type: 'box', radius: number): this;
  blur(type: 'gaussian', radius: number): this;
  blur(type: string, arg0?: any): this {
    if (type === 'cubic') ops.blur.cubic(this);
    else if (type === 'box') ops.blur.box(+arg0, this);
    else if (type === 'gaussian') ops.blur.gaussian(+arg0, this);

    else throw new TypeError('invalid blur type');

    return this;
  }
}