// reference codec struct

// dyn = Image or Frames<Frame>
// opts = Object & { limit?: u32 (bytes) | { width?: u32, height?: u32 } }

// is() -> bool
// init() -> ()
// encode(dyn, opts) -> Uint8Array
// encode_stream(dyn, opts) -> ReadableStream<Uint8Array>
// decode(dyn, opts) -> framebuffer or walker<framebuffer & { x: u32, y: u32, delay: u32 }>

const framebuffer = {
  x: 0, // offset
  y: 0, // offset
  delay: 0, // in ms

  width: 0,
  height: 0,
  buffer: new Uint8Array(0), // rgba
};

export class walker {
  width = 0;
  height = 0;

  drop() { return; }
  next() { return framebuffer; }
}

export class codec {
  static name = ''

  async init() {}
  static is(buf) { return false; }
  encode(dyn, opts) { throw new Error('not implemented'); }
  decode(buf, opts) { throw new Error('not implemented'); }
  encode_stream(dyn, opts) { throw new Error('not implemented'); }
}