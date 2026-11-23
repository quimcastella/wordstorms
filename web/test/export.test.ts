import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_OPTIONS, type Cloud, type PlacedWord, type Storm } from '../src/core/storm.ts';
import { VERSION } from '../src/core/version.ts';
import { cloudFileNames, cropStorm, stormToJson } from '../src/render/export.ts';

const word = (text: string, x: number, y: number, width = 40, height = 20): PlacedWord => ({
  text,
  x,
  y,
  width,
  height,
  originX: 0,
  originY: height,
  fontSize: 20,
  angle: 0,
  color: '#000000',
  opacity: 1,
  light: false,
  weight: 1,
  cloudCount: 1,
});

const storm = (clouds: Cloud[]): Storm => ({
  width: 640,
  height: 480,
  background: '#ffffff',
  clouds,
  stats: { passes: 1, forceIterations: 0, shrink: 1, millis: 0 },
  options: DEFAULT_OPTIONS,
});

describe('cropStorm', () => {
  const s = storm([
    { name: 'a', skipped: [], words: [word('one', 100, 100), word('two', 300, 200)] },
    { name: 'b', skipped: [], words: [word('three', 200, 150)] },
  ]);
  const { clouds, width, height } = cropStorm(s);

  it('cuts every cloud to one frame around all the words, with a small margin', () => {
    // Words span x 100–340 and y 100–220: 240 × 120, plus 2% of 240 (5 px) on each side.
    expect(width).toBe(250);
    expect(height).toBe(130);
  });

  it('moves every cloud by the same amount, so shared positions still line up', () => {
    expect(clouds[0].words[0]).toMatchObject({ x: 5, y: 5 });
    expect(clouds[1].words[0]).toMatchObject({ x: 105, y: 55 });
  });
});

describe('cloudFileNames', () => {
  it('makes names safe for any file system and unique', () => {
    const s = storm(['Hamlet', 'hamlet', 'What? / Why: "Not"', ''].map((name) => ({ name, skipped: [], words: [] })));
    expect(cloudFileNames(s, 'svg')).toEqual(['Hamlet.svg', 'hamlet (2).svg', 'What Why Not.svg', 'cloud 4.svg']);
  });
});

describe('stormToJson', () => {
  const s = storm([{ name: 'a', skipped: [], words: [word('one', 100, 100), word('two', 300, 200)] }]);

  it('uses the same cropped frame as the image files, and records how the storm was made', () => {
    const json = JSON.parse(stormToJson(s, { font: { id: 'oswald' } }));
    const cropped = cropStorm(s);
    expect(json).toMatchObject({ version: VERSION, font: { id: 'oswald' }, cropped: true, options: DEFAULT_OPTIONS });
    expect([json.width, json.height]).toEqual([cropped.width, cropped.height]);
    expect(json.clouds).toEqual(cropped.clouds);
  });

  it('keeps the layout frame with crop: false', () => {
    const json = JSON.parse(stormToJson(s, { crop: false }));
    expect([json.width, json.height, json.cropped]).toEqual([640, 480, false]);
    expect(json.clouds).toEqual(s.clouds);
  });
});

describe('VERSION', () => {
  it('matches package.json', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    expect(VERSION).toBe(pkg.version);
  });
});
