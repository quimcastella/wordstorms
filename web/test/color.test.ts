import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../src/core/color.ts';
import { PALETTES } from '../src/core/palettes.ts';

describe('palettes', () => {
  it('keeps every color at 3:1 contrast or more against the background', () => {
    for (const p of Object.values(PALETTES)) {
      for (const c of [...p.colors, ...p.warm, ...p.cool]) expect(contrastRatio(c, p.background)).toBeGreaterThanOrEqual(3);
    }
  });
});
