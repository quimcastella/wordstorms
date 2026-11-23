import { describe, expect, it } from 'vitest';
import { applyKeyness, applyTfIdf, countWords, mergePlurals, normalizeWeights, sortCounts, tokenize } from '../src/core/text.ts';

const opts = { textCase: 'lower', stopwords: 'english', extraStopwords: [], excludeNumbers: true } as const;

describe('tokenize', () => {
  it('keeps joined words and unicode letters together', () => {
    expect(tokenize("Don't stop—co-op e-mail naïve café 3.5 Zürich")).toEqual([
      "Don't", 'stop', 'co-op', 'e-mail', 'naïve', 'café', '3.5', 'Zürich',
    ]);
  });
});

describe('countWords', () => {
  it('drops stop words, single letters and numbers, and lower-cases', () => {
    const counts = countWords('The Tax and the TAX, a plan: 2012 plans. I’m sure x', opts);
    expect(Object.fromEntries(counts)).toEqual({ tax: 2, plan: 2, sure: 1 });
  });

  it('counts possessives with their noun, but keeps contractions as stop words', () => {
    const counts = countWords("Romney's plan, Romney said. It's what's next", opts);
    expect(Object.fromEntries(counts)).toEqual({ romney: 2, plan: 1, next: 1 });
  });

  it('drops filler and archaic words with the extended list, but keeps content words', () => {
    const text = 'Thou hast come now, my lord; one must go, and the king hath said so. Mr Darcy went home.';
    const extended = countWords(text, { ...opts, stopwords: 'extended' });
    expect([...extended.keys()].sort()).toEqual(['darcy', 'home', 'king', 'lord']);
    const original = countWords(text, opts);
    expect(original.has('thou')).toBe(true);
  });

  it('honors extra stop words', () => {
    const counts = countWords('governor governor romney', { ...opts, extraStopwords: ['Governor'] });
    expect([...counts.keys()]).toEqual(['romney']);
  });
});

describe('mergePlurals', () => {
  it('folds plurals into the singular when both exist', () => {
    const m = mergePlurals(new Map([['jobs', 3], ['job', 2], ['taxes', 1], ['news', 4]]));
    expect(Object.fromEntries(m)).toEqual({ job: 5, taxes: 1, news: 4 });
  });
});

describe('sortCounts', () => {
  it('sorts by count, then alphabetically', () => {
    expect(sortCounts(new Map([['b', 1], ['c', 2], ['a', 1]]))).toEqual([['c', 2], ['a', 1], ['b', 1]]);
  });
});

describe('normalizeWeights', () => {
  it('gives a mean weight of 0.6, proportional to count', () => {
    const w = normalizeWeights([['a', 6], ['b', 3], ['c', 1]]);
    expect(w.reduce((s, [, v]) => s + v, 0) / w.length).toBeCloseTo(0.6);
    expect(w[0][1] / w[1][1]).toBeCloseTo(2);
  });
});

describe('applyTfIdf', () => {
  it('zeroes words that appear in every document', () => {
    const [a] = applyTfIdf([new Map([['common', 5], ['rare', 1]]), new Map([['common', 2]])]);
    expect(a.get('common')).toBe(0);
    expect(a.get('rare')).toBeCloseTo(1);
  });
});

describe('applyKeyness', () => {
  it('keeps evenly used words and boosts words one document uses more', () => {
    const docs = [new Map([['even', 10], ['mine', 10]]), new Map([['even', 10], ['theirs', 10]])];
    const [a] = applyKeyness(docs, 1);
    expect(a.get('even')).toBeCloseTo(10); // same rate as the whole corpus
    expect(a.get('mine')).toBeCloseTo(20); // twice the corpus rate
    expect(applyKeyness(docs, 0.5)[0].get('mine')).toBeCloseTo(10 * Math.SQRT2);
  });

  it('does nothing at strength 0', () => {
    const docs = [new Map([['x', 3]]), new Map([['y', 4]])];
    expect(applyKeyness(docs, 0)).toEqual(docs);
  });
});
