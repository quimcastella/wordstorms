// Public API of the Word Storms library.
export { generateStorm, resolveOptions, DEFAULT_OPTIONS, PAPER_OPTIONS, MAX_SIZE } from './core/storm.ts';
export type { Doc, Storm, Cloud, PlacedWord, StormOptions, StormStats, Mode, Progress } from './core/storm.ts';
export { PALETTES } from './core/palettes.ts';
export type { Palette, PaletteName } from './core/palettes.ts';
export type { Angle, Glyph, GlyphMeasurer, Mask } from './core/glyph.ts';
export { createCanvasMeasurer, cssFont, DEFAULT_FONT } from './measure/canvas.ts';
export type { CanvasLike, FontSpec } from './measure/canvas.ts';
export { cloudToSvg, stormToSvg } from './render/svg.ts';
export type { SvgOptions } from './render/svg.ts';
export { cloudFileNames, cropStorm } from './render/export.ts';
export { stormToHtml } from './render/html.ts';
export type { HtmlOptions } from './render/html.ts';
export { drawCloud } from './render/canvas.ts';
export type { DrawContext } from './render/canvas.ts';
