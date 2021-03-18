export function view(buffer, shared = false) {
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  if (shared && buffer instanceof SharedArrayBuffer) return new Uint8Array(buffer);
  if (ArrayBuffer.isView(buffer)) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  throw new TypeError("The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
}

export function from_parts(buffers, shared = false) {
  let length = 0;
  let offset = 0;
  buffers.forEach(buffer => length += buffer.byteLength ?? buffer.length);
  const u8 = new Uint8Array(shared ? new SharedArrayBuffer(length) : length);

  buffers.forEach(buffer => {
    const ref = Array.isArray(buffer) ? buffer : view(buffer, true);

    u8.set(ref, offset);
    offset += ref.length;
  });

  return u8;
}