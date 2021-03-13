let wasm;

{
  const path = new URL(import.meta.url.replace('.js', '.wasm'));
  const module = new WebAssembly.Module(await ('file:' === path.protocol ? Deno.readFile(path) : fetch(path).then(r => r.arrayBuffer())));
  const instance = new WebAssembly.Instance(module);

  wasm = instance.exports;
}

class mem {
  static alloc(size) { return wasm.walloc(size); }
  static free(ptr, size) { return wasm.wfree(ptr, size); }
  static u8(ptr, size) { return new Uint8Array(wasm.memory.buffer, ptr, size); }
  static u32(ptr, size) { return new Uint32Array(wasm.memory.buffer, ptr, size); }
  static length() { return new Uint32Array(wasm.memory.buffer, wasm.cur_len.value, 1)[0]; }

  static copy_and_free(ptr, size) {
    let slice = mem.u8(ptr, size).slice();
    return (wasm.wfree(ptr, size), slice);
  }
}

export function encode(buffer, width, height, quality) {
  const ptr = mem.alloc(buffer.length);
  mem.u8(ptr, buffer.length).set(buffer);
  return mem.copy_and_free(wasm.encode(ptr, width, height, quality), mem.length());
}

export function decode(buffer, width, height) {
  const bptr = mem.alloc(buffer.length);
  mem.u8(bptr, buffer.length).set(buffer);
  const ptr = wasm.decode(bptr, buffer.length, width, height);

  if (0 === ptr) throw new Error('jpg: failed to decode');
  if (1 === ptr) throw new Error('jpg: failed to scale decoder');

  const framebuffer = {
    width: wasm.decode_width(ptr),
    height: wasm.decode_height(ptr),
    format: wasm.decode_format(ptr),
    buffer: mem.u8(wasm.decode_buffer(ptr), mem.length()).slice(),
  }

  return (wasm.decode_free(ptr), framebuffer);
}

export function load(buffer) {
  const framebuffer = decode(buffer);

  const old = framebuffer.buffer;
  if (2 !== framebuffer.format) framebuffer.buffer = new Uint8Array(4 * framebuffer.width * framebuffer.height);

  if (0 === framebuffer.format) {
    let offset = 0;
    const view = new DataView(framebuffer.buffer.buffer);
    while (offset < old.length) view.setUint32(4 * offset, old[offset] << 24 | old[offset] << 16 | old[offset++] << 8 | 0xff, false);
  }

  else if (2 === framebuffer.format) {
    let offset = 0;
    while (offset < old.length) {
      const k = old[3 + offset];
      old[offset] = k * old[offset++] / 255;
      old[offset] = k * old[offset++] / 255;
      old[offset] = k * old[offset++] / 255;

      old[offset++] = 0xff;
    }
  }

  else if (1 === framebuffer.format) {
    let offset = 0;
    let foffset = 0;
    framebuffer.buffer.fill(0xff);
    const length = 3 * framebuffer.width * framebuffer.height;

    while (offset < length) {
      framebuffer.buffer[foffset++] = old[offset++];
      framebuffer.buffer[foffset++] = old[offset++];
      framebuffer.buffer[foffset++] = old[offset++];

      foffset++;
    }
  }

  return framebuffer;
}