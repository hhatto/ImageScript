import * as magic from './codecs/magic.js';
import framebuffer from './framebuffer.ts';
import * as codecs from './codecs/index.js';
import * as bufferutil from './utils/buffer.js';

const image_formats = ['png', 'jpeg', 'tiff'];
const all_formats = ['png', 'gif', 'jpeg', 'tiff'];

type png_options = {
  /** zlib compression level (0-9) */
  level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
};

type gif_options = {
  /** frame quality (1-30) */
  quality?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30,
}

type jpeg_options = {
  /** image quality (1-100) */
  quality?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80 | 81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 | 90 | 91 | 92 | 93 | 94 | 95 | 96 | 97 | 98 | 99 | 100,
};

type svg_options = {
  /** image fit options */
  fit?: svg_fit_zoom | svg_fit_width | svg_fit_height,
};

type svg_fit_zoom = {
  /** zoom by factor */
  zoom: number,
  width?: undefined,
  height?: undefined,
};
type svg_fit_width = {
  /** scale to width */
  width: number,
  zoom?: undefined,
  height?: undefined,
};

type svg_fit_height = {
  /** scale to height */
  height: number,
  zoom?: undefined,
  width?: undefined,
};

/** load image from memory */
export function load(buffer: BufferSource): GIF | Image {
  const u8 = bufferutil.view(buffer);
  if (0 === u8.length) throw new TypeError('empty buffer');

  const meta = magic.buffer(u8);
  if (!meta) throw new Error('unknown file format');
  if ('image' !== meta.type) throw new Error('unsupported file type');
  if (!all_formats.includes(meta.format)) throw new Error('unsupported image format');
  if ('gif' === meta.format) return new GIF(null, null, null, codecs.gif.load(u8).map(x => new Frame(x.width, x.height, 10 * x.delay, x.buffer)));

  const frame = (<any>codecs)[meta.format].load(u8);
  return new Image(frame.width, frame.height, frame.buffer);
}

export class Frame extends framebuffer {
  duration: number;

  constructor(width: number, height: number, duration?: number);
  constructor(width: number, height: number, duration: null | number | undefined, buffer: BufferSource);
  constructor(width: number, height: number, duration?: number, buffer: BufferSource = new Uint8Array(4 * width * height)) {
    super(width, height, buffer);
    this.duration = duration ?? 100;
  }

  clone(): Frame { return new Frame(this.width, this.height, this.duration, this.u8.slice()); }
  overlay(framebuffer: Frame | Image, x: number = 0, y: number = 0): this { return super.overlay((<this>framebuffer), x, y); };
  replace(framebuffer: Frame | Image, x: number = 0, y: number = 0): this { return super.replace((<this>framebuffer), x, y); };
  from(framebuffer: Frame | Image): Frame { return new Frame(framebuffer.width, framebuffer.height, (<this>framebuffer).duration ?? 100, framebuffer.u8); }
}

export class GIF extends Array<Frame> {
  loops: number;
  width: number;
  height: number;

  constructor(width: number, height: number, loops?: number);
  constructor(width: null | number, height: null | number, loops: null | number | undefined, frames: Frame[]);
  constructor(width: number, height: number, loops?: number, frames: Frame[] = []) {
    super(...frames);
    this.loops = loops ?? -1;
    this.width = width ?? frames[0]?.width;
    this.height = height ?? frames[0]?.height;
  }

  clone(): GIF { return new GIF(this.width, this.height, this.loops, this.map(frame => frame.clone())); }
  static decode(buffer: BufferSource): GIF { return new GIF(null, null, null, codecs.gif.load(bufferutil.view(buffer)).map(x => new Frame(x.width, x.height, 10 * x.delay, x.buffer))); }

  encode(options: gif_options = {}): Uint8Array {
    const encoder = new codecs.gif.Encoder(this.width, this.height, this.loops);
    this.forEach(frame => encoder.add(frame.duration / 10, frame.width, frame.height, frame.u8, Math.abs(30 - ((options.quality ?? 21) - 1))));

    return encoder.u8();
  }

  resize(type: 'cubic' | 'linear' | 'nearest', width: number, height: number) {
    this.width = width;
    this.height = height;
    this.forEach(frame => frame.resize(type, width, height));
  }
}

export class Image extends framebuffer {
  /** create new image */
  constructor(width: number, height: number);
  /** create image view from buffer */
  constructor(width: number, height: number, buffer: BufferSource);
  constructor(width: number, height: number, buffer?: BufferSource) {
    super(width, height, buffer || new Uint8Array(4 * width * height));
  }

  clone(): Image { return new Image(this.width, this.height, this.u8.slice()); }
  from(framebuffer: Frame | Image): Image { return new Image(framebuffer.width, framebuffer.height, framebuffer.u8); }

  encode(format: 'png', options?: png_options): Uint8Array;
  encode(format: 'jpeg', options?: jpeg_options): Uint8Array;
  encode(format: string, options: any = {}): Uint8Array {
    if ('jpeg' === format) return codecs.jpeg.encode(this.u8, this.width, this.height, options.quality ?? 100);
    if ('png' === format) return codecs.png.encode(this.u8, { channels: 4, width: this.width, height: this.height, level: options.level ?? 1 });

    throw new TypeError('invalid image format');
  }

  static decode(format: 'png', buffer: BufferSource): Image;
  static decode(format: 'auto', buffer: BufferSource): Image;
  static decode(format: 'jpeg', buffer: BufferSource): Image;
  static decode(format: 'tiff', buffer: BufferSource): Image;
  static decode(format: 'svg', buffer: string | BufferSource, options?: svg_options): Image;
  static decode(format: string, buffer: string | BufferSource, options: any = {}): Image {
    buffer = bufferutil.view('string' === typeof buffer ? (<any>Deno).core.encode(buffer) : buffer);

    if ('auto' === format) {
      const meta = magic.buffer(buffer);
      if (!meta) throw new Error('unknown file format');
      if ('image' !== meta.type) throw new Error('unsupported file type');
      if (!image_formats.includes(meta.format)) throw new Error('unsupported image format');

      format = meta.format;
    }

    let frame;
    if (format in codecs) frame = (<any>codecs)[format].load(buffer);
    else if ('svg' === format) frame = codecs.svg.load(buffer, options.fit ?? null);

    if (!frame) throw new TypeError('invalid image format');
    return new Image(frame.width, frame.height, frame.buffer);
  }
}