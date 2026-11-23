import { describe, expect, it } from 'vitest';
import * as main from '../src/index.ts';
import { cloudToPng, createNodeMeasurer, generateStorm, stormToSvg } from '../src/node.ts';

const docs = [
  { name: 'A', words: { economy: 45, education: 32, health: 18 } },
  { name: 'B', text: 'health health health education economy growth' },
];

describe('wordstorms/node', () => {
  it('makes a storm without a measurer, and draws it as SVG and PNG', () => {
    const storm = generateStorm(docs);
    expect(storm.clouds.map((c) => c.words.length)).toEqual([3, 4]);
    expect(stormToSvg(storm)).toMatch(/^<svg/);
    const png = cloudToPng(storm.clouds[0], storm.width, storm.height, { background: storm.background, scale: 1 });
    expect([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG');
  });

  it('gives the same layout as the main entry point with the same measurer', () => {
    const measurer = createNodeMeasurer();
    expect(main.generateStorm(docs, {}, measurer).clouds).toEqual(generateStorm(docs, {}, measurer).clouds);
  });
});

describe('wordstorms', () => {
  it('explains what to do when it has no canvas to measure with', () => {
    expect(typeof OffscreenCanvas).toBe('undefined');
    expect(() => main.generateStorm(docs)).toThrow(/wordstorms\/node/);
  });
});
