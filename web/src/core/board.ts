import type { Mask } from './glyph.ts';

/**
 * A 1-bit occupancy grid for one cloud. It extends `margin` px beyond the
 * field on every side, so words placed outside the field (which unique words
 * may be) still collide with each other.
 */
export class Board {
  readonly width: number;
  readonly height: number;
  private readonly margin: number;
  private readonly stride: number;
  private readonly bits: Uint32Array;

  constructor(fieldWidth: number, fieldHeight: number, margin = Math.max(fieldWidth, fieldHeight)) {
    this.margin = margin;
    this.width = fieldWidth + 2 * margin;
    this.height = fieldHeight + 2 * margin;
    this.stride = Math.ceil(this.width / 32) + 1;
    this.bits = new Uint32Array(this.stride * this.height);
  }

  /** True if `mask`, with its box's top-left at (x, y) in field coordinates, hits anything. */
  collides(mask: Mask, x: number, y: number): boolean {
    return this.scan(mask, x, y, false);
  }

  add(mask: Mask, x: number, y: number): void {
    this.scan(mask, x, y, true);
  }

  private scan(mask: Mask, x: number, y: number, write: boolean): boolean {
    const left = Math.trunc(x) + mask.offsetX + this.margin;
    const top = Math.trunc(y) + mask.offsetY + this.margin;
    const shift = ((left % 32) + 32) % 32;
    const base = Math.floor(left / 32);
    for (let row = 0; row < mask.height; row++) {
      const by = top + row;
      if (by < 0 || by >= this.height) continue;
      const rowStart = by * this.stride;
      for (let k = 0; k < mask.stride; k++) {
        const word = mask.bits[row * mask.stride + k];
        if (word === 0) continue;
        const i = base + k;
        const hi = word >>> shift;
        const lo = shift === 0 ? 0 : (word << (32 - shift)) >>> 0;
        if (write) {
          if (i >= 0 && i < this.stride) this.bits[rowStart + i] |= hi;
          if (lo && i + 1 >= 0 && i + 1 < this.stride) this.bits[rowStart + i + 1] |= lo;
        } else {
          if (i >= 0 && i < this.stride && (this.bits[rowStart + i] & hi) !== 0) return true;
          if (lo && i + 1 >= 0 && i + 1 < this.stride && (this.bits[rowStart + i + 1] & lo) !== 0) return true;
        }
      }
    }
    return false;
  }
}
