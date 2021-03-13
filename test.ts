import { GIF, load, Image, Frame } from './mod.ts';
import { Font, Layout } from 'https://esm.sh/@evan/wasm/target/font/deno.js';

const image = load(await Deno.readFile('/Users/evan/GitHub/ImageScript/tests/targets/external.png')) as Image;

// while (true) {
//   const a = performance.now();
// image.rotate(271, false);
// console.log(performance.now() - a);

// }

// while (true) {
  // const a = performance.now();

  // console.log(performance.now() - a);
// }

// image.replace(image, image.width / 2, image.height / 2);

// image.flip('horizontal');

const image2 = new Image(image.width * 3, image.height * 3);

image2.replace(image, image.width);
image2.replace(image.flip('horizontal'));
image2.replace(image.flip('vertical'), 0, image.height);
image2.replace(image.flip('horizontal'), image.width, image.height);

// image2.crop('box', 0, 0, 350, 350);
// image2.crop('circle', 5);

const bb = await fetch('https://cdn.discordapp.com/avatars/61189081970774016/a_22a748dccaa9f9c0e29fd56764a56802.gif').then(x => x.arrayBuffer());


// while (true) {
//   const gif = GIF.decode(bb);
//   const a = performance.now();

//   // gif.map(x => x.resize('linear', 1024, 1024));
//   // i.fill(0xff0000ff);
//   // i.encode('png', { level: 3 });
//   // image.blur('gaussian', 20);
// // i.resize('nearest', 2000, 2000);
//   console.log(performance.now() - a);
// }

// image.resize('cubic', 24, 24);
// image.resize('cubic', 1000, 1000);

const avatar = Image.decode('png', await fetch('https://cdn.discordapp.com/avatars/440580043203280906/4f33abd16b0254cfc2deffd7c11fcc26.png').then(x => x.arrayBuffer()));

avatar.resize('cubic', 256, 256);

// image.blur('box', +Deno.args[0]);

// const gif2 = new GIF(128, 128, 0);

// // @ts-ignore
// gif2.push(new Frame(128, 128).overlay(avatar));

// // @ts-ignore
// gif2.push(new Frame(128, 128).overlay(avatar.rotate(45)));

// // @ts-ignore
// gif2.push(new Frame(128, 128).overlay(avatar.rotate(45)));
// // @ts-ignore
// gif2.push(new Frame(128, 128).overlay(avatar.rotate(45)));
// // @ts-ignore
// gif2.push(new Frame(128, 128).overlay(avatar.rotate(45)));
// // @ts-ignore
// gif2.push(new Frame(128, 128).overlay(avatar.rotate(45)));

// const gife = await Deno.readFile('./test.gif');

// while (true) {
//   const a = performance.now();
//   const gif3 = GIF.decode(gife);

//   gif3.width = 1024;
//   gif3.height = 1024;
//   gif3.forEach(frame => frame.resize('cubic', 1024, 1024));

//   // gif3.encode();
//   // await Deno.writeFile('./test2.gif', gif3.encode());
//   console.log(performance.now() - a);
// }

// while(true) {
//   const i = avatar.clone();
//   const a = performance.now();

//   i.resize('linear', 1024, 1024);
//   console.log(performance.now() - a);
// }


Deno.writeFile('./test.png', avatar.encode('png'));
