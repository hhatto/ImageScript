let mod;

{
  const path = new URL(import.meta.url.replace('.js', '.wasm'));
  mod = new WebAssembly.Module(await ('file:' === path.protocol ? Deno.readFile(path) : fetch(path).then(r => r.arrayBuffer())));
}

class module {
  constructor(bridge) { this.b = bridge; }
}

class bridge {
  io = new io(this);
  mem = new mem(this);

  wasm = new WebAssembly.Instance(mod, {
    io: {
      drop: this.io.drop.bind(this.io),
      read: this.io.read.bind(this.io),
      write: this.io.write.bind(this.io),
    },
  }).exports;
}

class mem extends module {
  len() { return this.b.wasm.wlen(); }
  alloc(size) { return this.b.wasm.walloc(size); }
  free(ptr, size) { return this.b.wasm.wfree(ptr, size); }
}

class io extends module {
  handles = new Map;
  static limit = 2 ** 16;

  drop(id) { this.handles.get(id).drop?.(); return this.handles.delete(id); }
  peek(ptr, size) { return new Uint8Array(this.b.wasm.memory.buffer, ptr, size); }
  new(id, inner, drop) { this.handles.set(id, { drop, inner, offset: 0 }); return id; }
  copy(ptr, size) { return new Uint8Array(this.b.wasm.memory.buffer, ptr, size).slice(); }
  write(id, ptr) { this.handles.get(id).inner(new Uint8Array(this.b.wasm.memory.buffer, ptr, this.b.mem.len())); }
  store(buf) { const ptr = this.b.mem.alloc(buf.length); return (new Uint8Array(this.b.wasm.memory.buffer, ptr, buf.length).set(buf), ptr); }
  load(ptr, size) { const slice = new Uint8Array(this.b.wasm.memory.buffer, ptr, size).slice(); return (this.b.mem.free(ptr, size), slice); }

  read(id, ptr) {
    const handle = this.handles.get(id);
    const buf = new Uint8Array(this.b.wasm.memory.buffer, ptr, this.b.mem.len());
    const slice = handle.inner.subarray(handle.offset, handle.offset + Math.min(io.limit, buf.length));

    buf.set(slice);
    return (handle.offset += slice.length, slice.length);
  }
}

export class jpeg extends bridge {
  static is(buf) {
    if (0xff === buf[0] && 0xd8 === buf[1] && 0xff === buf[2]) return true;
  }

  encode(buffer, { width, height, quality = 100 } = {}) {
    return this.io.load(this.wasm.encode(this.io.store(buffer), width, height, quality), this.mem.len());
  }

  decode(buffer, { limit } = {}) {
    const ptr = this.wasm.decode(this.io.store(buffer), buffer.length, limit?.width, limit?.height);

    if (1 === ptr) throw new Error('jpeg: image too large');
    if (2 === ptr) throw new Error('jpeg: failed to decode pixels');
    if (0 === ptr) throw new Error('jpeg: failed to decode header');

    const framebuffer = {
      width: this.wasm.decode_width(ptr),
      height: this.wasm.decode_height(ptr),
      buffer: this.io.copy(this.wasm.decode_buffer(ptr), this.mem.len()),
    }

    return (this.wasm.decode_free(ptr), framebuffer);
  }
}