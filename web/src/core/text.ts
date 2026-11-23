import { STOPWORDS, type StopwordLanguage } from './stopwords.ts';

export type TextCase = 'lower' | 'upper' | 'asis';

export interface CountOptions {
  textCase: TextCase;
  stopwords: StopwordLanguage;
  extraStopwords: readonly string[];
  excludeNumbers: boolean;
}

// Same token shape as cue.language's WordIterator: letter/digit runs, optionally
// joined by - . : / ' ’ ′ NBSP ZWNJ ZWJ ~ or combining marks.
const TOKEN = /[@+\p{L}\p{Nd}]+(?:[-.:/'’′ ‌‍~\p{M}]+[@+\p{L}\p{Nd}]+)*/gu;
// Roughly what Java's Double.parseDouble accepts.
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[fFdD]?$/;

export function tokenize(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

/** Counts words in a document, after case folding and stop word removal. */
export function countWords(text: string, opts: CountOptions): Map<string, number> {
  const folded =
    opts.textCase === 'lower' ? text.toLowerCase() : opts.textCase === 'upper' ? text.toUpperCase() : text;
  const stop = STOPWORDS[opts.stopwords];
  const extra = new Set(opts.extraStopwords.map((w) => w.toLowerCase()));
  const counts = new Map<string, number>();
  for (const raw of tokenize(folded)) {
    const key = raw.replace(/’/g, "'").toLowerCase();
    if (stop.has(key) || extra.has(key)) continue;
    // Count possessives with their noun ("holmes's" → "holmes").
    const token = raw.replace(/['’][sS]$/, '');
    if ([...token].length === 1) continue;
    if (stop.has(token.toLowerCase()) || extra.has(token.toLowerCase())) continue;
    if (opts.excludeNumbers && NUMBER.test(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return mergePlurals(counts);
}

/** Folds "xs" into "x" when both appear. */
export function mergePlurals(counts: Map<string, number>): Map<string, number> {
  const merged = new Map(counts);
  for (const [word, n] of counts) {
    if (word.length < 2 || !/s$/i.test(word)) continue;
    const singular = word.slice(0, -1);
    if (merged.has(singular) && merged.has(word)) {
      merged.set(singular, merged.get(singular)! + n);
      merged.delete(word);
    }
  }
  return merged;
}

/** Sorted by count descending, ties alphabetical. */
export function sortCounts(counts: Map<string, number>): [string, number][] {
  return [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

/** Multiplies each count by idf = ln(D/df)/ln(D), with df over full vocabularies. */
export function applyTfIdf(docs: Map<string, number>[]): Map<string, number>[] {
  const D = docs.length;
  if (D < 2) return docs;
  const df = new Map<string, number>();
  for (const doc of docs) for (const w of doc.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  return docs.map(
    (doc) => new Map([...doc].map(([w, n]) => [w, (n * Math.log(D / df.get(w)!)) / Math.log(D)] as [string, number])),
  );
}

/**
 * Keyness: multiplies each count by (rate in this document / rate in the whole
 * corpus)^strength. Words used evenly keep their count; words a document uses
 * more than the others grow, and words it uses less shrink. Unlike tf-idf, a
 * word every document uses can still matter if one uses it much more.
 */
export function applyKeyness(docs: Map<string, number>[], strength = 1): Map<string, number>[] {
  if (docs.length < 2) return docs;
  const totals = docs.map((d) => [...d.values()].reduce((s, n) => s + n, 0));
  const all = totals.reduce((s, n) => s + n, 0);
  const corpus = new Map<string, number>();
  for (const doc of docs) for (const [w, n] of doc) corpus.set(w, (corpus.get(w) ?? 0) + n);
  return docs.map(
    (doc, i) =>
      new Map(
        [...doc].map(([w, n]) => {
          const ratio = n / totals[i] / (corpus.get(w)! / all);
          return [w, n * ratio ** strength] as [string, number];
        }),
      ),
  );
}

/**
 * Weights for the kept words: proportional to count, with mean 0.6
 * (`0.6 · count · n / Σcount`), as in the original version.
 */
export function normalizeWeights(top: [string, number][]): [string, number][] {
  const sum = top.reduce((s, [, n]) => s + n, 0);
  if (sum === 0) return top.map(([w]) => [w, 0.6]);
  const scale = (0.6 * top.length) / sum;
  return top.map(([w, n]) => [w, n * scale]);
}
