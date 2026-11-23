// Word Storms for Node.js: everything in the main entry point, plus measuring
// and drawing text with @napi-rs/canvas, so storms need no setup.
//
//   import { generateStorm, stormToSvg } from 'wordstorms/node';
//   const svg = stormToSvg(generateStorm([{ name: 'A', text: a }, { name: 'B', text: b }]));
//
// The font must be installed, or registered with GlobalFonts from @napi-rs/canvas.
import { createCanvas } from '@napi-rs/canvas';
import type { GlyphMeasurer } from './core/glyph.ts';
import { generateStorm as layOut, type Cloud, type Doc, type Progress, type Storm, type StormOptions } from './core/storm.ts';
import { createCanvasMeasurer, DEFAULT_FONT, type FontSpec } from './measure/canvas.ts';
import { drawCloud } from './render/canvas.ts';

export * from './index.ts';

/** Measures text with @napi-rs/canvas in `font` (a CSS font-family list, or a family and weights). */
export function createNodeMeasurer(font: FontSpec | string = DEFAULT_FONT): GlyphMeasurer {
  return createCanvasMeasurer((w, h) => createCanvas(w, h), font);
}

/** Like `generateStorm` from `wordstorms`, measuring text with @napi-rs/canvas in the default font unless given a measurer. */
export function generateStorm(
  docs: Doc[],
  options: Partial<StormOptions> = {},
  measurer: GlyphMeasurer = createNodeMeasurer(),
  onProgress?: Progress,
): Storm {
  return layOut(docs, options, measurer, onProgress);
}

export interface PngOptions {
  /** The font the storm was measured with (default: the default font). */
  font?: FontSpec | string;
  /** Fill color; transparent if not given. Use `storm.background` for the palette's. */
  background?: string;
  /** Pixels per layout pixel (default 2). */
  scale?: number;
}

/** One cloud as PNG bytes (a Buffer), `width` × `height` layout px: a storm's size or `cropStorm`'s frame. */
export function cloudToPng(cloud: Cloud, width: number, height: number, opts: PngOptions = {}): Uint8Array {
  const { font = DEFAULT_FONT, background, scale = 2 } = opts;
  const canvas = createCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawCloud(ctx, cloud, typeof font === 'string' ? { family: font } : font, { scale });
  return canvas.toBuffer('image/png');
}
