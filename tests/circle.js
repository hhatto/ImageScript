import {Image} from '../ImageScript.js';
import {equal} from "https://deno.land/std/bytes/mod.ts";

(async () => {
    {
        const image = new Image(512, 512);
        image.drawCircle(256, 256, 128, 0xffffffff);

        const encoded = await image.encode();

        const target = await Deno.readFile('./tests/targets/circle.png');
        if (!equal(encoded, target)) process.exit(1);
    }

    {
        const image = new Image(512, 512);
        image.drawCircle(256, 256, 320, 0x000000ff);

        const encoded = await image.encode();

        const target = await Deno.readFile('./tests/targets/circle2.png');
        if (!equal(encoded, target)) process.exit(1);
    }

    {
        const image = new Image(256, 512);
        image.fill(0x000000ff);
        image.cropCircle();

        const encoded = await image.encode();

        const target = await Deno.readFile('./tests/targets/circle3.png');
        if (!equal(encoded, target)) process.exit(1);
    }

    {
        const image = new Image(256, 512);
        image.fill(0x000000ff);
        image.cropCircle(true, .5);

        const encoded = await image.encode();

        const target = await Deno.readFile('./tests/targets/circle4.png');
        if (!equal(encoded, target)) process.exit(1);
    }
})();