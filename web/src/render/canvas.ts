// Draws clouds on a 2D canvas (browser or @napi-rs/canvas), e.g. for PNGs.
import type { Cloud } from '../core/storm.ts';
import { cssFont, type FontSpec } from '../measure/canvas.ts';

/** The subset of the 2D canvas API drawing needs. */
export interface DrawContext {
  font: string;
  fillStyle: unknown;
  globalAlpha: number;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  rotate(angle: number): void;
  fillText(text: string, x: number, y: number): void;
}

/** Draws a cloud's words with its top-left corner at (x, y), everything multiplied by `scale`. */
export function drawCloud(ctx: DrawContext, cloud: Cloud, font: FontSpec, { x = 0, y = 0, scale = 1 } = {}): void {
  for (const w of cloud.words) {
    ctx.setTransform(scale, 0, 0, scale, x + (w.x + w.originX) * scale, y + (w.y + w.originY) * scale);
    ctx.rotate((w.angle * Math.PI) / 180);
    ctx.font = cssFont(font, w.fontSize, w.light);
    ctx.fillStyle = w.color;
    ctx.globalAlpha = w.opacity;
    ctx.fillText(w.text, 0, 0);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
}
