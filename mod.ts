import framebuffer from './src/framebuffer.ts';

// TODO: remove gif concept
// Frames<[Frame<{ x, y, image, delay }>]>, removes the need for frame specific logic within ops

// TODO: encode streams (useless concept for images if jit persists across wasm instances)
// FramesStream<>
// await Image.stream('png')
// await Image.buffer('png') -> stream().collect()

// TODO: custom codec support?
// await Image.stream(codec);
// await Image.buffer(codec);
// Codec<{ is(), init(), encode(), decode(), encode_stream() }>

// TODO: dynamically load builtin codecs? (idle builtin codec overhead 1mb stack + heap) (discard instance after gc/ttl?)

// TODO: codecs: copy or not

export class Image extends framebuffer {}
export class Frames<Frame> extends Array {}
export class Frame { x = 0; y = 0; delay = 0; }
