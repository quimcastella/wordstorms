import { describe, expect, it } from 'vitest';
import { Board } from '../src/core/board.ts';
import { boxMask, createMask, dilate, getPixel, setPixel } from '../src/core/glyph.ts';

describe('Board', () => {
  it('detects box overlaps at any alignment, including across 32-bit word boundaries', () => {
    for (const x of [0, 5, 31, 32, 33, 60]) {
      const board = new Board(200, 100);
      board.add(boxMask(10, 10, 0), x, 20);
      expect(board.collides(boxMask(10, 10, 0), x + 9, 20)).toBe(true);
      expect(board.collides(boxMask(10, 10, 0), x + 10, 20)).toBe(false);
      expect(board.collides(boxMask(10, 10, 0), x - 10, 20)).toBe(false);
      expect(board.collides(boxMask(10, 10, 0), x, 29)).toBe(true);
      expect(board.collides(boxMask(10, 10, 0), x, 30)).toBe(false);
    }
  });

  it('works outside the field (inside the margin)', () => {
    const board = new Board(100, 100);
    board.add(boxMask(10, 10, 0), -40, -40);
    expect(board.collides(boxMask(10, 10, 0), -35, -35)).toBe(true);
    expect(board.collides(boxMask(10, 10, 0), -20, -20)).toBe(false);
  });

  it('only collides on ink, not on empty parts of the box', () => {
    // An L shape: left column and bottom row of a 10×10 box.
    const l = createMask(10, 10);
    for (let i = 0; i < 10; i++) {
      setPixel(l, 0, i);
      setPixel(l, i, 9);
    }
    const board = new Board(100, 100);
    board.add(l, 10, 10);
    expect(board.collides(boxMask(5, 5, 0), 14, 12)).toBe(false); // in the L's empty corner
    expect(board.collides(boxMask(5, 5, 0), 14, 16)).toBe(true); // touches the bottom row
  });
});

describe('dilate', () => {
  it('grows ink by one pixel', () => {
    const m = createMask(5, 5);
    setPixel(m, 2, 2);
    const d = dilate(m);
    expect(getPixel(d, 1, 1)).toBe(true);
    expect(getPixel(d, 3, 3)).toBe(true);
    expect(getPixel(d, 0, 0)).toBe(false);
  });
});
