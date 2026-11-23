/** Rotation of a word, in degrees. +90 reads top to bottom, −90 bottom to top. */
export type Angle = 0 | 90 | -90;

/**
 * A 1-bit pixel mask, rows packed MSB-first into 32-bit words.
 * Pixel (0, 0) of the mask sits at (offsetX, offsetY) relative to the word's box.
 */
export interface Mask {
  width: number;
  height: number;
  /** 32-bit words per row. */
  stride: number;
  bits: Uint32Array;
  offsetX: number;
  offsetY: number;
}

/** A word measured at a given font size and angle. */
export interface Glyph {
  /** Tight bounding box of the ink, in px. */
  width: number;
  height: number;
  /** Where the text origin (baseline start, before rotation) sits relative to the box's top-left. */
  originX: number;
  originY: number;
  /** Ink mask, padded by 1 px. */
  mask: Mask;
}

/** Measures words. The browser and Node each provide one backed by a 2D canvas. */
export interface GlyphMeasurer {
  /** `light`: in the font's light weight, if it has one. */
  measure(text: string, fontSize: number, angle: Angle, light?: boolean): Glyph;
}

export function createMask(width: number, height: number, offsetX = 0, offsetY = 0): Mask {
  const stride = Math.ceil(width / 32) || 1;
  return { width, height, stride, bits: new Uint32Array(stride * height), offsetX, offsetY };
}

export function setPixel(mask: Mask, x: number, y: number): void {
  mask.bits[y * mask.stride + (x >> 5)] |= 0x80000000 >>> (x & 31);
}

export function getPixel(mask: Mask, x: number, y: number): boolean {
  return (mask.bits[y * mask.stride + (x >> 5)] & (0x80000000 >>> (x & 31))) !== 0;
}

/** A solid mask covering the word's box plus `pad` px on every side. */
export function boxMask(width: number, height: number, pad = 1): Mask {
  const w = Math.ceil(width) + 2 * pad;
  const h = Math.ceil(height) + 2 * pad;
  const mask = createMask(w, h, -pad, -pad);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) setPixel(mask, x, y);
  return mask;
}

/** Grows the ink by one pixel in the 8 directions (the original swells shapes by 1 px). */
export function dilate(mask: Mask): Mask {
  const out = createMask(mask.width, mask.height, mask.offsetX, mask.offsetY);
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (!getPixel(mask, x, y)) continue;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= mask.height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < mask.width) setPixel(out, xx, yy);
        }
      }
    }
  }
  return out;
}

/** Builds a mask from RGBA pixels (any alpha counts as ink), then pads by 1 px. */
export function maskFromAlpha(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
): Mask {
  const mask = createMask(width, height, offsetX, offsetY);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > 0) setPixel(mask, x, y);
    }
  }
  return dilate(mask);
}
