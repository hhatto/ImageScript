/* global SharedArrayBuffer */
const {inflate} = require('zlib');
const crc32 = require('./crc32.js');
const {compress} = require('./wasm/zlib.js');

const __IHDR__ = new Uint8Array([73, 72, 68, 82]);
const __IDAT__ = new Uint8Array([73, 68, 65, 84]);
const __IEND__ = new Uint8Array([73, 69, 78, 68]);
const __IEND_CRC__ = crc32(new Uint8Array([73, 69, 78, 68]));
const HEAD = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const color_types = {
    GREYSCALE: 0,
    TRUECOLOR: 2,
    INDEXED_COLOR: 3,
    GREYSCALE_ALPHA: 4,
    TRUECOLOR_ALPHA: 6
};

const channels_to_color_type = {
    1: color_types.GREYSCALE,
    2: color_types.GREYSCALE_ALPHA,

    3: color_types.TRUECOLOR,
    4: color_types.TRUECOLOR_ALPHA
};

module.exports = {
    async encode(data, {width, height, channels, depth = 8, level = 0}) {
        let offset = 0;
        let tmp_offset = 0;
        const row_length = width * channels;
        const tmp = new Uint8Array(height + data.length);

        while (offset < data.length) {
            tmp[tmp_offset++] = 0;
            tmp.set(data.subarray(offset, (offset += row_length)), tmp_offset);

            tmp_offset += row_length;
        }

        const compressed = await compress(tmp, level);
        const array = new Uint8Array(49 + HEAD.length + compressed.length);

        array[26] = 0;
        array[27] = 0;
        array[28] = 0;
        array[24] = depth;
        array.set(HEAD, 0);
        array.set(__IHDR__, 12);
        array.set(__IDAT__, 37);
        array.set(compressed, 41);
        array.set(__IEND__, 49 + compressed.length);
        array[25] = channels_to_color_type[channels];

        const view = new DataView(array.buffer);

        view.setUint32(8, 13);
        view.setUint32(16, width);
        view.setUint32(20, height);
        view.setUint32(33, compressed.length);
        view.setUint32(45 + compressed.length, 0);
        view.setUint32(53 + compressed.length, __IEND_CRC__);
        view.setUint32(29, crc32(new Uint8Array(array.buffer, 12, 17)));
        view.setUint32(41 + compressed.length, crc32(new Uint8Array(array.buffer, 37, 4 + compressed.length)));

        return array;
    },
    async decode(array) {
        const view = new DataView(array.buffer);

        const width = view.getUint32(16);
        const height = view.getUint32(20);
        const channels = ({2: 3, 6: 4})[array[25]];

        const row_length = width * channels;
        const pixels = new Uint8Array(height * row_length);

        let offset = 0;
        let p_offset = 0;

        let c_offset = 33;
        const chunks = [];

        let type;
        while (type !== 1229278788) {
            type = view.getUint32(4 + c_offset);

            // IDAT
            if (type === 1229209940)
                chunks.push(array.subarray(8 + c_offset, 8 + c_offset + view.getUint32(c_offset)));

            c_offset += 4 + 4 + 4 + view.getUint32(c_offset);
        }

        array = await new Promise((resolve, reject) => inflate(chunks.length === 1 ? chunks[0] : Buffer.concat(chunks), (err, res) => err ? reject(err) : resolve(res)));

        while (offset < array.byteLength) {
            const filter = array[offset++];
            const slice = array.subarray(offset, offset += row_length);

            if (0 === filter) pixels.set(slice, p_offset);
            else if (1 === filter) this.filter_1(slice, pixels, p_offset, channels, row_length);
            else if (2 === filter) this.filter_2(slice, pixels, p_offset, channels, row_length);
            else if (3 === filter) this.filter_3(slice, pixels, p_offset, channels, row_length);
            else if (4 === filter) this.filter_4(slice, pixels, p_offset, channels, row_length);

            p_offset += row_length;
        }

        const isPassable = new SharedArrayBuffer(pixels.length + 4);
        const dataArray = new Uint8Array(isPassable);
        dataArray.set([(width >> 8) & 0xff, width & 0xff, (height >> 8) & 0xff, height & 0xff]);
        dataArray.set(pixels, 4);
        return isPassable;
    },

    filter_1(slice, pixels, p_offset, channels, row_length) {
        let i = 0;
        while (i < channels) pixels[i + p_offset] = slice[i++];
        while (i < row_length) pixels[i + p_offset] = slice[i] + pixels[i++ + p_offset - channels];
    },

    filter_2(slice, pixels, p_offset, channels, row_length) {
        if (0 === p_offset) pixels.set(slice, p_offset);
        else {
            let i = 0;
            while (i < row_length) pixels[i + p_offset] = slice[i] + pixels[i++ + p_offset - row_length];
        }
    },

    filter_3(slice, pixels, p_offset, channels, row_length) {
        let i = 0;

        if (0 === p_offset) {
            while (i < channels) pixels[i + p_offset] = slice[i++];
            while (i < row_length) pixels[i + p_offset] = slice[i] + (pixels[i++ + p_offset - channels] >> 1);
        } else {
            while (i < channels) pixels[i + p_offset] = slice[i] + (pixels[i + p_offset - row_length] >> 1);
            while (i < row_length) pixels[i + p_offset] = slice[i] + (pixels[i + p_offset - channels] + pixels[i + p_offset - row_length] >> 1);
        }
    },

    filter_4(slice, pixels, p_offset, channels, row_length) {
        let i = 0;

        if (0 === p_offset) {
            while (i < channels) pixels[i + p_offset] = slice[i++];
            while (i < row_length) pixels[i + p_offset] = slice[i] + pixels[i++ + p_offset - channels];
        } else {
            while (i < channels) pixels[i + p_offset] = slice[i] + pixels[i++ + p_offset - row_length];

            while (i < row_length) {
                const a = pixels[i + p_offset - channels];
                const b = pixels[i + p_offset - row_length];
                const c = pixels[i + p_offset - channels - row_length];

                const p = a + b - c;
                const pa = Math.abs(p - a);
                const pb = Math.abs(p - b);
                const pc = Math.abs(p - c);

                pixels[i + p_offset] = slice[i++] + ((pa <= pb && pa <= pc) ? a : ((pb <= pc) ? b : c));
            }
        }
    }
};