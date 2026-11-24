import { createCanvas } from '@napi-rs/canvas';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PALETTES } from '../src/core/palettes.ts';
import { DEFAULT_OPTIONS, generateStorm, resolveOptions, type Storm } from '../src/core/storm.ts';
import { createCanvasMeasurer } from '../src/measure/canvas.ts';

const dir = join(__dirname, '..', '..', 'examples', 'Shakespeare');
const docs = readdirSync(dir)
  .filter((f) => f.endsWith('.txt'))
  .sort()
  .map((f) => ({ name: f, text: readFileSync(join(dir, f), 'utf8') }));
const measurer = () => createCanvasMeasurer((w, h) => createCanvas(w, h), 'Helvetica');

// Plain word counts, so the plays' most common words ("good") are in every cloud.
const counts = { maxWords: 25, distinctiveness: 0, fadeCommonWords: true };

describe('generateStorm', () => {
  const coordinated = generateStorm(docs, { ...counts, mode: 'coordinated' }, measurer());
  const independent = generateStorm(docs, { ...counts, mode: 'independent' }, measurer());

  it('makes one cloud per document, each with up to maxWords words', () => {
    for (const storm of [coordinated, independent]) {
      expect(storm.clouds.map((c) => c.name)).toEqual(docs.map((d) => d.name));
      for (const c of storm.clouds) {
        expect(c.words.length + c.skipped.length).toBe(25);
        expect(c.words.length).toBeGreaterThan(20);
      }
    }
  });

  it('records the resolved options', () => {
    expect(coordinated.options).toEqual({ ...DEFAULT_OPTIONS, ...counts, mode: 'coordinated' });
  });

  it('lines shared words up far better than separate clouds do', () => {
    const c = coordinated.stats.sharedOffset;
    const i = independent.stats.sharedOffset;
    expect(c.mean).toBeGreaterThan(0);
    expect(c.mean * 3).toBeLessThan(i.mean);
    expect(c.max).toBeLessThan(i.max);
  });

  it('reports placement and leaves at most sub-pixel overlaps', () => {
    for (const { stats, clouds } of [coordinated, independent]) {
      expect(stats.selectedWords).toBe(clouds.length * 25);
      expect(stats.placedWords).toBe(clouds.reduce((n, c) => n + c.words.length, 0));
      expect(stats.forceConverged).toBe(true);
    }
    expect(coordinated.stats.overlap.maxDepth).toBeLessThan(2);
    expect(independent.stats.overlap).toEqual({ pairs: 0, maxDepth: 0 });
  });

  it('keeps every placed word inside the frame, with finite numbers', () => {
    for (const storm of [coordinated, independent]) {
      for (const w of storm.clouds.flatMap((c) => c.words)) {
        for (const v of [w.x, w.y, w.width, w.height, w.fontSize]) expect(Number.isFinite(v)).toBe(true);
        expect(w.x).toBeGreaterThanOrEqual(-0.5);
        expect(w.y).toBeGreaterThanOrEqual(-0.5);
        expect(w.x + w.width).toBeLessThanOrEqual(storm.width + 0.5);
        expect(w.y + w.height).toBeLessThanOrEqual(storm.height + 0.5);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const again = generateStorm(docs, { ...counts, mode: 'coordinated' }, measurer());
    expect(again.clouds).toEqual(coordinated.clouds);
    const other = generateStorm(docs, { ...counts, mode: 'coordinated', seed: 7 }, measurer());
    expect(other.clouds).not.toEqual(coordinated.clouds);
  });

  it('keeps every word inside the frame', () => {
    for (const storm of [coordinated, independent]) {
      for (const w of storm.clouds.flatMap((c) => c.words)) {
        expect(w.x).toBeGreaterThanOrEqual(-0.5);
        expect(w.y).toBeGreaterThanOrEqual(-0.5);
        expect(w.x + w.width).toBeLessThanOrEqual(storm.width + 0.5);
        expect(w.y + w.height).toBeLessThanOrEqual(storm.height + 0.5);
      }
    }
  });

  it('gives a shared word the same color and angle in every cloud when coordinated', () => {
    const seen = new Map<string, string>();
    for (const w of coordinated.clouds.flatMap((c) => c.words)) {
      const style = `${w.color}|${w.angle}`;
      expect(seen.get(w.text) ?? style).toBe(style);
      seen.set(w.text, style);
    }
  });

  it('colors words from the chosen palette and reports its background', () => {
    expect(coordinated.background).toBe(PALETTES.storm.background);
    const midnight = generateStorm(docs.slice(0, 2), { palette: 'midnight', maxWords: 10, markShared: 'none' }, measurer());
    expect(midnight.background).toBe(PALETTES.midnight.background);
    for (const w of midnight.clouds.flatMap((c) => c.words)) expect(PALETTES.midnight.colors).toContain(w.color);
  });

  it('marks shared words by weight: only words one cloud has are light', () => {
    const storm = generateStorm(docs, { ...counts, markShared: 'weight' }, measurer());
    const words = storm.clouds.flatMap((c) => c.words);
    for (const w of words) expect(w.light).toBe(w.cloudCount === 1);
    expect(words.some((w) => w.light)).toBe(true);
    for (const w of words) expect(PALETTES.storm.colors).toContain(w.color);
  });

  it('marks shared words by warmth: warm colors for shared words, cool for the rest', () => {
    const storm = generateStorm(docs, { ...counts, markShared: 'warmth' }, measurer());
    for (const w of storm.clouds.flatMap((c) => c.words)) {
      expect(w.light).toBe(false);
      expect(w.cloudCount > 1 ? PALETTES.storm.warm : PALETTES.storm.cool).toContain(w.color);
    }
  });

  it('marks nothing by default', () => {
    expect(coordinated.clouds.flatMap((c) => c.words).some((w) => w.light)).toBe(false);
  });

  it('draws no vertical words when verticalShare is 0', () => {
    const flat = generateStorm(docs.slice(0, 2), { maxWords: 15, verticalShare: 0 }, measurer());
    expect(flat.clouds.flatMap((c) => c.words).every((w) => w.angle === 0)).toBe(true);
  });

  it('narrows the range of font sizes with a lower sizeExponent', () => {
    const range = (s: Storm) => {
      const sizes = s.clouds[0].words.map((w) => w.fontSize);
      return Math.max(...sizes) / Math.min(...sizes);
    };
    const linear = generateStorm(docs.slice(0, 2), { ...counts, sizeExponent: 1 }, measurer());
    const gentle = generateStorm(docs.slice(0, 2), { ...counts, sizeExponent: 0.5 }, measurer());
    expect(range(gentle)).toBeLessThan(range(linear));
  });

  it('fades words that every cloud shares', () => {
    const good = coordinated.clouds[0].words.find((w) => w.text === 'good')!;
    expect(good.cloudCount).toBe(6);
    expect(good.opacity).toBeLessThan(0.5);
  });

  it('places shared words close to each other across clouds', () => {
    // "good" is in all six clouds; its centers should be much closer than the frame size.
    const centers = coordinated.clouds.map((c) => {
      const w = c.words.find((x) => x.text === 'good')!;
      return [w.x + w.width / 2, w.y + w.height / 2];
    });
    const spread = Math.max(...centers.map(([x]) => x)) - Math.min(...centers.map(([x]) => x));
    expect(spread).toBeLessThan(coordinated.width / 4);
  });

  it('never lets ink overlap in independent clouds', () => {
    expect(inkOverlaps(independent)).toBe(0);
  });

  it('(the overlap check itself catches stacked words)', () => {
    const w = independent.clouds[0].words[0];
    const stacked = { ...independent, clouds: [{ name: 'x', skipped: [], words: [w, { ...w, x: w.x + 3 }] }] };
    expect(inkOverlaps(stacked)).toBeGreaterThan(100);
  });
});

/** Pixels (solid ink, alpha > 50%) drawn by more than one word, summed over clouds. */
function inkOverlaps(storm: Storm): number {
  let shared = 0;
  const canvas = createCanvas(storm.width, storm.height);
  const ctx = canvas.getContext('2d');
  for (const cloud of storm.clouds) {
    const hits = new Uint8Array(storm.width * storm.height);
    for (const w of cloud.words) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, storm.width, storm.height);
      ctx.translate(w.x + w.originX, w.y + w.originY);
      ctx.rotate((w.angle * Math.PI) / 180);
      ctx.font = `${w.fontSize}px Helvetica`;
      ctx.fillText(w.text, 0, 0);
      const { data } = ctx.getImageData(0, 0, storm.width, storm.height);
      for (let i = 0; i < hits.length; i++) {
        if (data[i * 4 + 3] > 128 && hits[i]++ === 1) shared++;
      }
    }
  }
  return shared;
}

describe('generateStorm edge cases', () => {
  const finiteWords = (storm: Storm) =>
    storm.clouds.every((c) =>
      c.words.every((w) => [w.x, w.y, w.width, w.height, w.fontSize, w.weight].every(Number.isFinite)),
    );

  it('drops words every document has with tf-idf instead of bringing them back', () => {
    const text = 'castle castle castle dragon dragon knight';
    const storm = generateStorm(
      [
        { name: 'a', text },
        { name: 'b', text },
      ],
      { weighting: 'tfidf', distinctiveness: 0.2 },
      measurer(),
    );
    expect(storm.clouds.map((c) => c.words.length + c.skipped.length)).toEqual([0, 0]);
  });

  it('copes with tf-idf plus keyness, empty documents and stop-word-only documents', () => {
    const storm = generateStorm(
      [
        { name: 'shared', text: 'river stone river stone forest' },
        { name: 'also', text: 'river stone mountain mountain' },
        { name: 'empty', text: '' },
        { name: 'stop', text: 'the and of a to in' },
      ],
      { weighting: 'tfidf', distinctiveness: 0.5 },
      measurer(),
    );
    expect(finiteWords(storm)).toBe(true);
    const texts = (i: number) => storm.clouds[i].words.map((w) => w.text).sort();
    expect(texts(0)).toEqual(['forest', 'river', 'stone']);
    expect(texts(1)).toEqual(['mountain', 'river', 'stone']);
    expect(storm.clouds[2].words).toEqual([]);
    expect(storm.clouds[3].words).toEqual([]);
  });
});

describe('resolveOptions', () => {
  it('fills in defaults and ignores undefined values', () => {
    expect(resolveOptions({ maxWords: 10, seed: undefined })).toEqual({ ...DEFAULT_OPTIONS, maxWords: 10 });
  });

  it.each([
    [{ width: 0 }, /width/],
    [{ height: -5 }, /height/],
    [{ width: Number.NaN }, /width/],
    [{ maxWords: 2.5 }, /maxWords: expected an integer/],
    [{ maxWords: 0 }, /maxWords/],
    [{ minFontSize: 30, maxFontSize: 20 }, /maxFontSize/],
    [{ distinctiveness: 2 }, /distinctiveness/],
    [{ verticalShare: -0.1 }, /verticalShare/],
    [{ sizeExponent: 0 }, /sizeExponent/],
    [{ mode: 'grid' }, /mode: expected one of "coordinated", "independent"/],
    [{ palette: 'neon' }, /palette/],
    [{ stopwords: 'klingon' }, /stopwords/],
    [{ extraStopwords: 'the' }, /extraStopwords/],
    [{ maxIterations: 0 }, /maxIterations/],
  ])('rejects %j', (bad, message) => {
    expect(() => resolveOptions(bad as never)).toThrow(message);
  });
});

describe('generateStorm with too little room', () => {
  const docs = [
    { name: 'a', text: 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda omicron sigma omega' },
    { name: 'b', text: 'alpha beta gamma delta upsilon phi chi psi rho tau pi nu xi mu' },
  ];

  it.each(['coordinated', 'independent'] as const)('ends in %s mode and reports what did not fit', (mode) => {
    const storm = generateStorm(docs, { mode, width: 4, height: 4 }, measurer());
    expect(storm.stats.shrink).toBeGreaterThanOrEqual(0.1);
    for (const c of storm.clouds) {
      expect(c.words.length + c.skipped.length).toBe(14);
      expect(c.skipped.length).toBeGreaterThan(0);
      for (const w of c.words) for (const v of [w.x, w.y, w.width, w.height]) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('rejects documents without text', () => {
    expect(() => generateStorm([{ name: 'a' } as never], {}, measurer())).toThrow(/Document 0/);
  });

  it('accepts no documents', () => {
    expect(generateStorm([], {}, measurer()).clouds).toEqual([]);
  });
});

describe('generateStorm with word counts', () => {
  const a = { name: 'A', words: { economy: 45, education: 32, health: 18 } };
  const b = { name: 'B', words: new Map([['economy', 12], ['education', 28], ['health', 42], ['Café', 3]]) };

  it('uses the given weights as they are, without stop words or case folding', () => {
    const storm = generateStorm([a, b], { distinctiveness: 0 }, measurer());
    const weights = Object.fromEntries(storm.clouds[0].words.map((w) => [w.text, w.weight]));
    expect(Object.keys(weights).sort()).toEqual(['economy', 'education', 'health']);
    expect(weights.economy / weights.health).toBeCloseTo(45 / 18);
    expect(storm.clouds[1].words.map((w) => w.text)).toContain('Café');
    expect(storm.clouds[0].words.every((w) => w.cloudCount === 2)).toBe(true);
  });

  it('mixes with text documents and still honors extraStopwords', () => {
    const storm = generateStorm(
      [a, { name: 'T', text: 'economy economy growth' }],
      { extraStopwords: ['health'] },
      measurer(),
    );
    expect(storm.clouds[0].words.map((w) => w.text).sort()).toEqual(['economy', 'education']);
    expect(storm.clouds[1].words.map((w) => w.text).sort()).toEqual(['economy', 'growth']);
  });

  it('drops zero weights and rejects bad ones', () => {
    const storm = generateStorm([{ name: 'z', words: { kept: 2, gone: 0 } }], {}, measurer());
    expect(storm.clouds[0].words.map((w) => w.text)).toEqual(['kept']);
    expect(() => generateStorm([{ name: 'n', words: { x: -1 } }], {}, measurer())).toThrow(/weight of "x"/);
    expect(() => generateStorm([{ name: 's', words: { x: '3' } } as never], {}, measurer())).toThrow(/weight of "x"/);
    expect(() => generateStorm([{ name: 'both', text: 'a', words: {} } as never], {}, measurer())).toThrow(/both/);
  });
});
