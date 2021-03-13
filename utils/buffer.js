export function view(buffer, shared = false) {
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  if (shared && buffer instanceof SharedArrayBuffer) return new Uint8Array(buffer);
  if (ArrayBuffer.isView(buffer)) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  throw new TypeError("The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
}

export function from_parts(buffers) {
  let length = 0;
  let offset = 0;
  buffers.forEach(buffer => length += buffer.length);

  const u8 = new Uint8Array(length);
  buffers.forEach(buffer => (u8.set(buffer, offset), offset += buffer.length));

  return u8;
}