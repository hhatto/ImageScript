import { adler32 } from './crc.js';

const SIZE = 65530;
const HEAD = new Uint8Array([120, 1]);

export function clength(size) {
  const n = Math.floor(size / SIZE);
  return 2 + 4 + size + 5 * (n + (n * SIZE === size ? 0 : 1));
}

export function blength(buffer) {
  const n = Math.floor(buffer.length / SIZE);
  return 2 + 4 + buffer.length + 5 * (n + (n * SIZE === buffer.length ? 0 : 1));
}

export function compress(buffer) {
  const length = blength(buffer);

  let pos = 0;
  let offset = 2;
  const crc = new adler32();
  const array = new Uint8Array(length);
  const view = new DataView(array.buffer);

  array.set(HEAD, 0);

  while (true) {
    const next = Math.min(pos + SIZE, buffer.length);

    const chunk_length = next - pos;
    const last = next === buffer.length;

    array[offset++] = last ? 1 : 0;
    array[offset++] = chunk_length & 0xff;
    array[offset++] = (chunk_length >> 8) & 0xff;
    array[offset++] = 0xff - (chunk_length & 0xff);
    array[offset++] = 0xff - ((chunk_length >> 8) & 0xff);

    const slice = buffer.subarray(pos, next);

    crc.update(slice);
    array.set(slice, offset);
    offset += slice.byteLength;

    if (last) break;
    else pos = next;
  }

  view.setUint32(offset, crc.hash);

  return array;
}

export function compress_into(buffer, target) {
  let pos = 0;
  let offset = 2;
  const crc = new adler32();
  const view = new DataView(target.buffer, target.byteOffset, target.byteLength);

  target.set(HEAD, 0);

  while (true) {
    const next = Math.min(pos + SIZE, buffer.length);

    const chunk_length = next - pos;
    const last = next === buffer.length;

    target[offset++] = last ? 1 : 0;
    target[offset++] = chunk_length & 0xff;
    target[offset++] = (chunk_length >> 8) & 0xff;
    target[offset++] = 0xff - (chunk_length & 0xff);
    target[offset++] = 0xff - ((chunk_length >> 8) & 0xff);

    const slice = buffer.subarray(pos, next);

    crc.update(slice);
    target.set(slice, offset);
    offset += slice.byteLength;

    if (last) break;
    else pos = next;
  }

  view.setUint32(offset, crc.hash);

  return target;
}