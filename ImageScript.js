export class Image {


  /**
   * Gets the pixel color at the specified position
   * @param {number} x
   * @param {number} y
   * @returns {number} The color value
   */
  getPixelAt(x, y) {
    this.__check_boundaries__(x, y);
    return this.__view__.getUint32((~~y - 1) * this.width + (~~x - 1), false);
  }

  /**
   * Gets the pixel color at the specified position
   * @param {number} x
   * @param {number} y
   * @returns {Uint8ClampedArray} The RGBA value
   */
  getRGBAAt(x, y) {
    this.__check_boundaries__(x, y);
    const idx = ((~~y - 1) * this.width + (~~x - 1)) * 4;
    return this.bitmap.subarray(idx, idx + 4);
  }

  /**
   * Sets the pixel color for the specified position
   * @param {number} x
   * @param {number} y
   * @param {number} pixelColor
   */
  setPixelAt(x, y, pixelColor) {
    x = ~~x;
    y = ~~y;
    this.__check_boundaries__(x, y);
    this.__set_pixel__(x, y, pixelColor);
    return this;
  }

  /**
   * @private
   * @param {number} x
   * @param {number} y
   */
  __check_boundaries__(x, y) {
    if (isNaN(x)) throw new TypeError(`Invalid pixel coordinates (x=${x})`);
    if (isNaN(y)) throw new TypeError(`Invalid pixel coordinates (y=${y})`);
    if (x < 1)
      throw new RangeError(`${Image.__out_of_bounds__} (x=${x})<1`);
    if (x > this.width)
      throw new RangeError(`${Image.__out_of_bounds__} (x=${x})>(width=${this.width})`);
    if (y < 1)
      throw new RangeError(`${Image.__out_of_bounds__} (y=${y})<1`);
    if (y > this.height)
      throw new RangeError(`${Image.__out_of_bounds__} (y=${y})>(height=${this.height})`);
  }

  /**
   * @private
   */
  static get __out_of_bounds__() {
    return 'Tried referencing a pixel outside of the images boundaries:';
  }

  /**
   * Draws a box at the specified coordinates
   * @param {number} x The x offset
   * @param {number} y The y offset
   * @param {number} width The box width
   * @param {number} height The box height
   * @param {number|colorFunction} color The color to fill the box in with
   * @returns {Image}
   */
  drawBox(x, y, width, height, color) {
    x -= 1;
    y -= 1;

    if (typeof color === 'function') {
      for (let tY = 1; tY <= height; tY++) {
        for (let tX = 1; tX <= width; tX++) {
          const nX = tX + x;
          const nY = tY + y;
          if (Math.min(nX, nY) < 1 || nX > this.width || nY > this.height)
            continue;

          const tC = color(tX, tY);
          this.__set_pixel__(nX, nY, tC);
        }
      }
    } else return this.__fast_box__(x, y, width, height, color);

    return this;
  }

  /**
   * @private
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} color
   */
  __fast_box__(x, y, width, height, color) {
    if (x < 0) {
      width += x;
      x = 1;
    }

    if (y < 0) {
      height += y;
      y = 1;
    }

    const right = Math.max(Math.min(x + width, this.width), 1);
    let xPos = right;
    while (x <= --xPos)
      this.__view__.setUint32(4 * (xPos + y * this.width), color);
    const end = 4 * (right + y * this.width);
    const start = 4 * (x + y * this.width);

    let bottom = Math.max(Math.min(y + height, this.height), 1);
    while (y < --bottom)
      this.bitmap.copyWithin(4 * (x + bottom * this.width), start, end);

    return this;
  }

  /**
   * Draws a circle at the specified coordinates with the specified radius
   * @param {number} x The center x position
   * @param {number} y The center y position
   * @param {number} radius The circles radius
   * @param {number|colorFunction} color
   * @returns {Image}
   */
  drawCircle(x, y, radius, color) {
    const radSquared = radius ** 2;
    for (let currentY = Math.max(1, y - radius); currentY <= Math.min(y + radius, this.height); currentY++) {
      for (let currentX = Math.max(1, x - radius); currentX <= Math.min(x + radius, this.width); currentX++) {
        if ((currentX - x) ** 2 + (currentY - y) ** 2 < radSquared)
          this.__set_pixel__(currentX, currentY, typeof color === 'function' ? color(currentX - x + radius, currentY - y + radius) : color);
      }
    }

    return this;
  }

  /**
   * Sets the images opacity
   * @param {number} opacity The opacity to apply (0..1)
   * @param {boolean} absolute Whether to scale the current opacity (false) or just set the new opacity (true)
   * @returns {Image}
   */
  opacity(opacity, absolute = false) {
    if (isNaN(opacity) || opacity < 0)
      throw new RangeError('Invalid opacity value');

    this.__set_channel_value__(opacity, absolute, 3);

    return this;
  }

  /**
   * Sets the red channels saturation
   * @param {number} saturation The saturation to apply (0..1)
   * @param {boolean} absolute Whether to scale the current saturation (false) or just set the new saturation (true)
   * @returns {Image}
   */
  red(saturation, absolute = false) {
    if (isNaN(saturation) || saturation < 0)
      throw new RangeError('Invalid saturation value');

    this.__set_channel_value__(saturation, absolute, 0);

    return this;
  }

  /**
   * Sets the green channels saturation
   * @param {number} saturation The saturation to apply (0..1)
   * @param {boolean} absolute Whether to scale the current saturation (false) or just set the new saturation (true)
   * @returns {Image}
   */
  green(saturation, absolute = false) {
    if (isNaN(saturation) || saturation < 0)
      throw new RangeError('Invalid saturation value');

    this.__set_channel_value__(saturation, absolute, 1);

    return this;
  }

  /**
   * Sets the blue channels saturation
   * @param {number} saturation The saturation to apply (0..1)
   * @param {boolean} absolute Whether to scale the current saturation (false) or just set the new saturation (true)
   * @returns {Image}
   */
  blue(saturation, absolute = false) {
    if (isNaN(saturation) || saturation < 0)
      throw new RangeError('Invalid saturation value');

    this.__set_channel_value__(saturation, absolute, 2);

    return this;
  }

  /**
   * @private
   * @param {number} value
   * @param {boolean} absolute
   * @param {number} offset
   */
  __set_channel_value__(value, absolute, offset) {
    for (let i = offset; i < this.bitmap.length; i += 4)
      this.bitmap[i] = value * (absolute ? 255 : this.bitmap[i]);
  }

  /**
   * Sets the brightness of the image
   * @param {number} value The lightness to apply (0..1)
   * @param {boolean} absolute Whether to scale the current lightness (false) or just set the new lightness (true)
   * @returns {Image}
   */
  lightness(value, absolute = false) {
    if (isNaN(value) || value < 0)
      throw new RangeError('Invalid lightness value');

    return this.fill((x, y) => {
      const [h, s, l, a] = Image.rgbaToHSLA(...this.getRGBAAt(x, y));
      return Image.hslaToColor(h, s, value * (absolute ? 1 : l), a);
    });
  }

  /**
   * Sets the saturation of the image
   * @param {number} value The saturation to apply (0..1)
   * @param {boolean} absolute Whether to scale the current saturation (false) or just set the new saturation (true)
   * @returns {Image}
   */
  saturation(value, absolute = false) {
    if (isNaN(value) || value < 0)
      throw new RangeError('Invalid saturation value');

    return this.fill((x, y) => {
      const [h, s, l, a] = Image.rgbaToHSLA(...this.getRGBAAt(x, y));
      return Image.hslaToColor(h, value * (absolute ? 1 : s), l, a);
    });
  }


  /**
   * Inverts the images colors
   * @returns {Image}
   */
  invert() {
    for (const [x, y, color] of this.iterateWithColors())
      this.__set_pixel__(x, y, ((0xffffffff - color) & 0xffffff00) | (color & 0xff));

    return this;
  }

  /**
   * Inverts the images value (lightness)
   * @returns {Image}
   */
  invertValue() {
    for (const [x, y, color] of this.iterateWithColors()) {
      const [h, s, l, a] = Image.rgbaToHSLA(...Image.colorToRGBA(color));
      this.__set_pixel__(x, y, Image.hslaToColor(h, s, 1 - l, a));
    }

    return this;
  }

  /**
   * Inverts the images saturation
   * @returns {Image}
   */
  invertSaturation() {
    for (const [x, y, color] of this.iterateWithColors()) {
      const [h, s, l, a] = Image.rgbaToHSLA(...Image.colorToRGBA(color));
      this.__set_pixel__(x, y, Image.hslaToColor(h, 1 - s, l, a));
    }

    return this;
  }

  /**
   * Inverts the images hue
   * @returns {Image}
   */
  invertHue() {
    for (const [x, y, color] of this.iterateWithColors()) {
      const [h, s, l, a] = Image.rgbaToHSLA(...Image.colorToRGBA(color));
      this.__set_pixel__(x, y, Image.hslaToColor(1 - h, s, l, a));
    }

    return this;
  }

  /**
   * Shifts the images hue
   * @param {number} degrees How many degrees to shift the hue by
   */
  hueShift(degrees) {
    for (const [x, y, color] of this.iterateWithColors()) {
      const [h, s, l, a] = Image.rgbaToHSLA(...Image.colorToRGBA(color));
      this.__set_pixel__(x, y, Image.hslaToColor(h + degrees / 360, s, l, a));
    }

    return this;
  }

  /**
   * Gets the average color of the image
   * @returns {number}
   */
  averageColor() {
    let colorAvg = [0, 0, 0];
    let divisor = 0;
    for (let idx = 0; idx < this.bitmap.length; idx += 4) {
      const rgba = this.bitmap.subarray(idx, idx + 4);
      for (let i = 0; i < 3; i++)
        colorAvg[i] += rgba[i];
      divisor += rgba[3] / 255;
    }

    return Image.rgbaToColor(...colorAvg.map(v => v / divisor), 0xff);
  }

  /**
   * Gets the images dominant color
   * @param {boolean} [ignoreBlack=true] Whether to ignore dark colors below the threshold
   * @param {boolean} [ignoreWhite=true] Whether to ignore light colors above the threshold
   * @param {number} [bwThreshold=0xf] The black/white threshold (0-64)
   * @return {number} The images dominant color
   */
  dominantColor(ignoreBlack = true, ignoreWhite = true, bwThreshold = 0xf) {
    const colorCounts = new Array(0x3ffff);
    for (let i = 0; i < this.bitmap.length; i += 4) {
      const color = this.__view__.getUint32(i, false);
      const [h, s, l] = Image.rgbaToHSLA(...Image.colorToRGBA(color)).map(v => (~~(v * 0x3f)));
      if (ignoreBlack && l < bwThreshold) continue;
      if (ignoreWhite && l > 0x3f - bwThreshold) continue;
      const key = h << 12 | s << 6 | l;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    let maxColorCount = -1;
    let mostProminentValue = 0;
    colorCounts.forEach((el, i) => {
      if (el < maxColorCount) return;
      maxColorCount = el;
      mostProminentValue = i;
    });

    if (mostProminentValue === -1)
      return this.dominantColor(ignoreBlack, ignoreWhite, bwThreshold - 1);

    const h = (mostProminentValue >>> 12) & 0x3f;
    const s = (mostProminentValue >>> 6) & 0x3f;
    const l = mostProminentValue & 0x3f;

    return Image.hslaToColor(h / 0x3f, s / 0x3f, l / 0x3f, 1);
  }


  /**
   * @private
   * @param {Image} image
   * @returns {Image}
   */
  __apply__(image) {
    this.__width__ = image.__width__;
    this.__height__ = image.__height__;
    this.__view__ = image.__view__;
    this.__u32__ = image.__u32__;
    this.bitmap = image.bitmap;

    return this;
  }

  /**
   * Creates a multi-point gradient generator
   * @param {Object<number, number>} colors The gradient points to use (e.g. `{0: 0xff0000ff, 1: 0x00ff00ff}`)
   * @return {(function(number): number)} The gradient generator. The function argument is the position in the gradient (0..1).
   */
  static gradient(colors) {
    const entries = Object.entries(colors).sort((a, b) => a[0] - b[0]);
    const positions = entries.map(e => parseFloat(e[0]));
    const values = entries.map(e => e[1]);

    if (positions.length === 0) throw new RangeError('Invalid gradient point count');
    else if (positions.length === 1) {
      return () => values[0];
    } else if (positions.length === 2) {
      const gradient = this.__gradient__(values[0], values[1]);
      return position => {
        if (position <= positions[0]) return values[0];
        if (position >= positions[1]) return values[1];
        return gradient((position - positions[0]) / (positions[1] - positions[0]));
      };
    }

    const minDef = Math.min(...positions);
    const maxDef = Math.max(...positions);
    let gradients = [];

    for (let i = 0; i < positions.length; i++) {
      let minPos = positions[i - 1];
      if (minPos === undefined) continue;

      let maxPos = positions[i];

      let minVal = values[i - 1];
      if (minVal === undefined) minVal = values[i];

      const maxVal = values[i];
      const gradient = this.__gradient__(minVal, maxVal);

      gradients.push({ min: minPos, max: maxPos, gradient });
    }

    return position => {
      if (position <= minDef) return gradients[0].gradient(0);
      if (position >= maxDef) return gradients[gradients.length - 1].gradient(1);

      for (const gradient of gradients)
        if (position >= gradient.min && position <= gradient.max)
          return gradient.gradient((position - gradient.min) / (gradient.max - gradient.min));
      throw new RangeError(`Invalid gradient position: ${position}`);
    };
  }

  /**
   * Rounds the images corners
   * @param {number} [radius=min(width,height)/4] The radius of the corners
   * @return {Image}
   */
  roundCorners(radius = Math.min(this.width, this.height) / 4) {
    const radSquared = radius ** 2;
    for (let x = 1; x <= radius; x++) {
      const xRad = (x - radius) ** 2;
      for (let y = 1; y <= radius; y++) {
        if (xRad + (y - radius) ** 2 > radSquared)
          this.bitmap[((y - 1) * this.width + x - 1) * 4 + 3] = 0;
      }
    }

    for (let x = 1; x <= radius; x++) {
      const xRad = (x - radius) ** 2;
      for (let y = this.height - radius; y <= this.height; y++) {
        if (xRad + ((this.height - y) - radius) ** 2 > radSquared)
          this.bitmap[((y - 1) * this.width + x - 1) * 4 + 3] = 0;
      }
    }

    for (let x = this.width - radius; x <= this.width; x++) {
      const xRad = ((this.width - x) - radius) ** 2;
      for (let y = 1; y <= radius; y++) {
        if (xRad + (y - radius) ** 2 > radSquared)
          this.bitmap[((y - 1) * this.width + x - 1) * 4 + 3] = 0;
      }
    }

    for (let x = this.width - radius; x <= this.width; x++) {
      const xRad = ((this.width - x) - radius) ** 2;
      for (let y = this.height - radius; y <= this.height; y++) {
        if (xRad + ((this.height - y) - radius) ** 2 > radSquared)
          this.bitmap[((y - 1) * this.width + x - 1) * 4 + 3] = 0;
      }
    }

    return this;
  }

  /**
   * @private
   */
  static __gradient__(startColor, endColor) {
    const sr = startColor >>> 24;
    const sg = startColor >> 16 & 0xff;
    const sb = startColor >> 8 & 0xff;
    const sa = startColor & 0xff;
    const er = (endColor >>> 24) - sr;
    const eg = (endColor >> 16 & 0xff) - sg;
    const eb = (endColor >> 8 & 0xff) - sb;
    const ea = (endColor & 0xff) - sa;

    return position => {
      const r = sr + position * er;
      const g = sg + position * eg;
      const b = sb + position * eb;
      const a = sa + position * ea;
      return (((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | (a & 0xff));
    };
  }


  /**
   * Creates a new image containing the rendered text.
   * @param {Uint8Array} font TrueType (ttf/ttc) or OpenType (otf) font buffer to use
   * @param {number} scale Font size to use
   * @param {string} text Text to render
   * @param {number} color Text color to use
   * @param {number} wrapWidth Image width before wrapping
   * @param {boolean} wrapStyle Whether to break at words ({@link WRAP_STYLE_WORD}) or at characters ({@link WRAP_STYLE_CHAR})
   * @return {Image} The rendered text
   */
  static renderText(font, scale, text, color = 0xffffffff, wrapWidth = Infinity, wrapStyle = this.WRAP_STYLE_WORD) {
    font = new codecs.ttf.Font(scale, font);
    const [r, g, b, a] = Image.colorToRGBA(color);

    const layout = new codecs.ttf.Layout();

    layout.reset({
      wrap_style: wrapStyle ? 'word' : 'letter',
      max_width: Infinity === wrapWidth ? null : wrapWidth,
    });

    layout.append(font, text, scale);
    const framebuffer = layout.rasterize(r, g, b);
    const image = new this(framebuffer.width, framebuffer.height);

    image.bitmap.set(framebuffer.buffer);

    font.free();
    layout.free();
    return image.opacity(a / 0xff);
  }
}
