import { maskFromAlpha, type Angle, type Glyph, type GlyphMeasurer } from '../core/glyph.ts';

/** The subset of the 2D canvas API we need; satisfied by DOM, OffscreenCanvas and @napi-rs/canvas. */
export interface Canvas2D {
  font: string;
  fillStyle: unknown;
  textBaseline: unknown;
  measureText(text: string): {
    actualBoundingBoxLeft: number;
    actualBoundingBoxRight: number;
    actualBoundingBoxAscent: number;
    actualBoundingBoxDescent: number;
  };
  clearRect(x: number, y: number, w: number, h: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  fillText(text: string, x: number, y: number): void;
  getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray | Uint8Array };
}

export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: '2d', options?: { willReadFrequently?: boolean }): unknown;
}

export const DEFAULT_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/** A CSS font-family list and weight. */
export interface FontSpec {
  family: string;
  weight?: number;
  /** Weight for light words; without one, light words use `weight`. */
  lightWeight?: number;
}

/** The CSS font weight for a word. */
export const fontWeight = (font: FontSpec, light = false): number =>
  (light ? font.lightWeight : undefined) ?? font.weight ?? 400;

/** The CSS `font` shorthand for a font at a size. */
export function cssFont(font: FontSpec, size: number, light = false): string {
  return `${fontWeight(font, light)} ${size}px ${font.family}`;
}

/**
 * Measures words with a 2D canvas: the tight ink box from measureText, and an
 * ink mask by drawing the word (rotated) and reading its pixels back.
 * The font must already be loaded wherever the canvas lives.
 */
export function createCanvasMeasurer(
  createCanvas: (width: number, height: number) => CanvasLike,
  font: FontSpec | string = DEFAULT_FONT,
): GlyphMeasurer {
  const spec: FontSpec = typeof font === 'string' ? { family: font } : font;
  const canvas = createCanvas(256, 256);
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as Canvas2D;
  const cache = new Map<string, Glyph>();

  return {
    measure(text: string, fontSize: number, angle: Angle, light = false): Glyph {
      const size = Math.round(fontSize * 100) / 100;
      const key = `${angle}|${size}|${light ? 'l' : ''}|${text}`;
      const hit = cache.get(key);
      if (hit) return hit;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = cssFont(spec, size, light);
      ctx.textBaseline = 'alphabetic';
      const m = ctx.measureText(text);
      const left = m.actualBoundingBoxLeft;
      const right = m.actualBoundingBoxRight;
      const ascent = m.actualBoundingBoxAscent;
      const descent = m.actualBoundingBoxDescent;
      const w0 = Math.max(1, left + right);
      const h0 = Math.max(1, ascent + descent);

      // Box size and text origin after rotating by `angle` (y points down, so +90 is clockwise).
      const [width, height, originX, originY] =
        angle === 0
          ? [w0, h0, left, ascent]
          : angle === 90
            ? [h0, w0, descent, left]
            : [h0, w0, ascent, right];

      // Draw with a 2 px margin so the 1 px dilation has room.
      const margin = 2;
      const mw = Math.ceil(width) + 2 * margin;
      const mh = Math.ceil(height) + 2 * margin;
      if (canvas.width < mw) canvas.width = mw;
      if (canvas.height < mh) canvas.height = mh;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = cssFont(spec, size, light);
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#000';
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      ctx.setTransform(cos, sin, -sin, cos, margin + originX, margin + originY);
      ctx.fillText(text, 0, 0);
      const { data } = ctx.getImageData(0, 0, mw, mh);
      const mask = maskFromAlpha(data, mw, mh, -margin, -margin);

      const glyph: Glyph = { width, height, originX, originY, mask };
      cache.set(key, glyph);
      return glyph;
    },
  };
}
