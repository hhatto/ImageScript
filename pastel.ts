import { Image } from './mod.ts';
import * as color_manip from './ops/color.js';
import { Font, Layout } from 'https://esm.sh/@evan/wasm/target/font/deno.js';

const gap = 2;
const color = new Image(16, 16);
const image = new Image(40, 20);

const grey = 0xb2b2b2ff;
const white = 0xe4e4e4ff;
const black = 0x1e1e1eff;
const target = 0xAB16C0CC;

color.fill((x, y) => {
  x = x % gap;
  return (y % gap) ? (x ? grey : white) : (!x ? grey : white);
});

image.fill(black);
image.replace(color, gap, gap);
image.overlay(new Image(12, 12).fill(target), 2 * gap, 2 * gap);

image.scale('nearest', 25);

const font = new Font(32 / 1.5, await Deno.readFile('/System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts/SF-Mono-Regular.otf'));

const layout = new Layout();
const [r, g, b, a] = color_manip.to_rgba(target);

layout.reset({});

// @ts-ignore
layout.append(font, `hex: #${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a === 255 ? '' : a.toString(16).padStart(2, '0')}\n`);

// @ts-ignore
layout.append(font, `rgb: rgb(${r}, ${g}, ${b}${a === 255 ? '' : `, ${Math.round(100 / 255 * a)}%`})`);

let text = layout.rasterize(255, 255, 255);

// @ts-ignore
text = new Image(text.width, text.height, text.buffer);

// @ts-ignore
image.overlay(text, (20) * 25, gap * 25);

// @ts-ignore
Deno.writeFile('./test.png', image.encode('png'));