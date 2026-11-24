// Public API of the Word Storms library: the layout, measuring text with a
// canvas, and drawing as SVG, HTML or on a canvas. Nothing here needs Node.js
// or a DOM; `wordstorms/node` adds a measurer and PNGs for Node.js.
import { generateStorm as layOut, type Doc, type Progress, type Storm, type StormOptions } from './core/storm.ts';
import type { GlyphMeasurer } from './core/glyph.ts';
import { createCanvasMeasurer } from './measure/canvas.ts';

/**
 * Builds a word storm: one cloud per document, laid out together (or apart, with `mode: 'independent'`).
 * Text is measured with `measurer`; without one, with an `OffscreenCanvas` in the
 * default font, where there is one (browsers and web workers). In Node.js, import
 * `generateStorm` from `wordstorms/node` instead, or pass a measurer.
 */
export function generateStorm(
  docs: Doc[],
  options: Partial<StormOptions> = {},
  measurer: GlyphMeasurer = offscreenMeasurer(),
  onProgress?: Progress,
): Storm {
  return layOut(docs, options, measurer, onProgress);
}

function offscreenMeasurer(): GlyphMeasurer {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error(
      "generateStorm needs a way to measure text: pass createCanvasMeasurer(...), or in Node.js import { generateStorm } from 'wordstorms/node'.",
    );
  }
  return createCanvasMeasurer((w, h) => new OffscreenCanvas(w, h));
}

export { resolveOptions, DEFAULT_OPTIONS, PAPER_OPTIONS, MAX_SIZE } from './core/storm.ts';
export type { Doc, TextDoc, CountsDoc, Storm, Cloud, PlacedWord, StormOptions, StormStats, Mode, Progress } from './core/storm.ts';
export { PALETTES } from './core/palettes.ts';
export type { Palette, PaletteName } from './core/palettes.ts';
export { LANGUAGES } from './core/language.ts';
export type { Language } from './core/language.ts';
export type { Morphology, TextCase } from './core/text.ts';
export type { StopwordLanguage } from './core/stopwords.ts';
export type { Angle, Glyph, GlyphMeasurer, Mask } from './core/glyph.ts';
export { createCanvasMeasurer, cssFont, DEFAULT_FONT } from './measure/canvas.ts';
export type { CanvasLike, FontSpec } from './measure/canvas.ts';
export { cloudToSvg, stormToSvg } from './render/svg.ts';
export type { SvgOptions } from './render/svg.ts';
export { cloudFileNames, cropStorm, stormToJson } from './render/export.ts';
export type { JsonOptions } from './render/export.ts';
export { VERSION } from './core/version.ts';
export { stormToHtml } from './render/html.ts';
export type { HtmlOptions } from './render/html.ts';
export { drawCloud } from './render/canvas.ts';
export type { DrawContext } from './render/canvas.ts';
