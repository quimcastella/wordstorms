import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../src/app/example-list.ts';
import { FONT_LIST } from '../src/app/font-list.ts';
import { PALETTES } from '../src/core/palettes.ts';

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const shapes = [...html.matchAll(/<option value="(\d+x\d+)"/g)].map((m) => m[1]);
const onStep = (v: number, steps: number) => Math.abs(v * steps - Math.round(v * steps)) < 1e-9;

describe('example looks', () => {
  it('only use values the panel controls can show', () => {
    expect(shapes.length).toBeGreaterThan(0);
    for (const { id, look } of EXAMPLES) {
      const o = look.options;
      expect(FONT_LIST.map((f) => f.id), id).toContain(look.font);
      expect(Object.keys(PALETTES), id).toContain(o.palette);
      expect(shapes, id).toContain(`${o.width}x${o.height}`);
      expect(o.maxWords % 5 === 0 && o.maxWords >= 10 && o.maxWords <= 80, `${id} words`).toBe(true);
      expect(onStep(o.distinctiveness, 10) && o.distinctiveness <= 1, `${id} distinctiveness`).toBe(true);
      expect(onStep(o.sizeExponent, 10) && o.sizeExponent >= 0.5 && o.sizeExponent <= 1.5, `${id} size`).toBe(true);
      expect(onStep(o.verticalShare, 14) && o.verticalShare <= 1, `${id} vertical`).toBe(true);
    }
  });
});
