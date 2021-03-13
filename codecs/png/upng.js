import { crc32 } from './crc.js';
import { clength, compress_into } from './uzlib.js';

const __IHDR__ = new Uint8Array([73, 72, 68, 82]);
const __IDAT__ = new Uint8Array([73, 68, 65, 84]);
const __IEND__ = new Uint8Array([73, 69, 78, 68]);
const __IEND_CRC__ = crc32(new Uint8Array([73, 69, 78, 68]));
const HEAD = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const color_types = {
  GREYSCALE: 0,
  TRUECOLOR: 2,
  INDEXED_COLOR: 3,
  GREYSCALE_ALPHA: 4,
  TRUECOLOR_ALPHA: 6,
};

const channels_to_color_type = {
  1: color_types.GREYSCALE,
  2: color_types.GREYSCALE_ALPHA,

  3: color_types.TRUECOLOR,
  4: color_types.TRUECOLOR_ALPHA,
};

export function encode(data, { width, height, channels, depth = 8 }) {
  const compressed_size = clength(height + data.length);
  const array = new Uint8Array(49 + 3501 + HEAD.length + compressed_size);

  array[26] = 0;
  array[27] = 0;
  array[28] = 0;
  array[24] = depth;
  array.set(HEAD, 0);
  array.set(__IHDR__, 12);
  array.set(__IDAT__, 37);
  array[25] = channels_to_color_type[channels];

  const view = new DataView(array.buffer);

  view.setUint32(8, 13);
  view.setUint32(16, width);
  view.setUint32(20, height);
  view.setUint32(33, compressed_size);
  view.setUint32(29, crc32(new Uint8Array(array.buffer, 12, 17)));

  let offset = 0;
  let tmp_offset = 0;
  const row_length = width * channels;
  const tmp = new Uint8Array(array.buffer, 3550, height + data.length);

  while (offset < data.length) {
    tmp[tmp_offset++] = 0;
    tmp.set(data.subarray(offset, (offset += row_length)), tmp_offset);

    tmp_offset += row_length;
  }

  compress_into(tmp, new Uint8Array(array.buffer, 41, compressed_size));
  view.setUint32(41 + compressed_size, crc32(new Uint8Array(array.buffer, 37, 4 + compressed_size)));

  view.setUint32(45 + compressed_size, 0);
  array.set(__IEND__, 49 + compressed_size);
  view.setUint32(53 + compressed_size, __IEND_CRC__);
  return new Uint8Array(array.buffer, 0, array.length - 3501);
}