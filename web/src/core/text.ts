import { STOPWORDS, type StopwordLanguage } from './stopwords.ts';

export type TextCase = 'lower' | 'upper' | 'asis';

/**
 * Language-specific clean-up of word forms:
 * `english` counts possessives with their noun (holmes's → holmes) and folds
 * plurals into singulars when both appear (jobs → job); `catalan` splits off
 * elided articles and pronouns (l'home → home, d'aigua → aigua) and attached
 * pronouns (dir-ho → dir, donar-te'l → donar); `none` counts tokens as they are.
 */
export type Morphology = 'english' | 'catalan' | 'none';

export interface CountOptions {
  textCase: TextCase;
  stopwords: StopwordLanguage;
  extraStopwords: readonly string[];
  excludeNumbers: boolean;
  /** Default `english`. */
  morphology?: Morphology;
  /** Shorter words are dropped, in characters (default 2: single letters go). */
  minWordLength?: number;
}

// Same token shape as cue.language's WordIterator: letter/digit runs, optionally
// joined by - . : / ' ’ ′ NBSP ZWNJ ZWJ ~ or combining marks.
const TOKEN = /[@+\p{L}\p{Nd}]+(?:[-.:/'’′ ‌‍~\p{M}]+[@+\p{L}\p{Nd}]+)*/gu;
// Roughly what Java's Double.parseDouble accepts.
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[fFdD]?$/;

export function tokenize(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

// Catalan elisions before a word (l', d', s', m', t', n', qu') and pronouns after a verb
// ('l, 'ls, 'n, 'm, 't, 's, 'ns, 'us, 'hi, 'ho, or -ho, -te, -la, -los…, possibly several).
const CATALAN_ELISION = /^(?:qu|[ldsmtn])['’](?=\p{L})/iu;
const CATALAN_CLITICS =
  /(?:['’](?:ls|ns|us|hi|ho|[lnmts])|-(?:me|te|se|nos|vos|lo|la|los|les|li|hi|ho|ne|en|el|els|ens|us|[lnmts]))+$/iu;

/** A token's countable form under `morphology`. */
function wordForm(token: string, morphology: Morphology): string {
  if (morphology === 'english') return token.replace(/['’][sS]$/, '');
  if (morphology === 'catalan') return token.replace(CATALAN_ELISION, '').replace(CATALAN_CLITICS, '');
  return token;
}

/** Counts words in a document, after Unicode normalization, case folding and stop word removal. */
export function countWords(text: string, opts: CountOptions): Map<string, number> {
  const morphology = opts.morphology ?? 'english';
  const minLength = opts.minWordLength ?? 2;
  // NFC, so a decomposed "é" (e + combining accent) counts as the same word as "é".
  const nfc = text.normalize('NFC');
  const folded = opts.textCase === 'lower' ? nfc.toLowerCase() : opts.textCase === 'upper' ? nfc.toUpperCase() : nfc;
  const stop = STOPWORDS[opts.stopwords];
  const extra = new Set(opts.extraStopwords.map((w) => w.normalize('NFC').toLowerCase()));
  const isStop = (w: string) => {
    const key = w.replace(/’/g, "'").toLowerCase();
    return stop.has(key) || extra.has(key);
  };
  const counts = new Map<string, number>();
  for (const raw of tokenize(folded)) {
    // The stop list is checked first, so "it's" stays a stop word rather than becoming "it".
    if (isStop(raw)) continue;
    const token = wordForm(raw, morphology);
    if ([...token].length < minLength) continue;
    if (isStop(token)) continue;
    if (opts.excludeNumbers && NUMBER.test(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return morphology === 'english' ? mergePlurals(counts) : counts;
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

/**
 * Sorted by weight descending; ties go to the word this document uses more than
 * the others (higher `keyness`), then to the word that comes first in `weights`
 * (for counted text, the one that appears first in the document).
 */
export function rankByKeyness(weights: Map<string, number>, keyness: Map<string, number>): [string, number][] {
  return [...weights].sort((a, b) => b[1] - a[1] || (keyness.get(b[0]) ?? 0) - (keyness.get(a[0]) ?? 0));
}

/** Each word's keyness ratio per document: its rate in the document over its rate in the corpus. */
export function keynessRatios(docs: Map<string, number>[]): Map<string, number>[] {
  return applyKeyness(docs, 1).map((keyed, i) => new Map([...keyed].map(([w, k]) => [w, k / docs[i].get(w)!])));
}

/** idf = ln(D/df)/ln(D) per word, with df over full vocabularies: 0 for a word in every document. */
export function inverseDocumentFrequency(docs: Map<string, number>[]): Map<string, number> {
  const D = docs.length;
  const df = new Map<string, number>();
  for (const doc of docs) for (const w of doc.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  return new Map([...df].map(([w, n]) => [w, D < 2 ? 1 : Math.log(D / n) / Math.log(D)]));
}

/** Multiplies each count by its idf (see `inverseDocumentFrequency`). */
export function applyTfIdf(docs: Map<string, number>[]): Map<string, number>[] {
  if (docs.length < 2) return docs;
  const idf = inverseDocumentFrequency(docs);
  return docs.map((doc) => new Map([...doc].map(([w, n]) => [w, n * idf.get(w)!] as [string, number])));
}

/**
 * Keyness: multiplies each count by (rate in this document / rate in the whole
 * corpus)^strength. Words used evenly keep their count; words a document uses
 * more than the others grow, and words it uses less shrink. Unlike tf-idf, a
 * word every document uses can still matter if one uses it much more.
 * Expects positive counts.
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
 * Each word's weight before ranking: its count, times its idf with tf-idf, times
 * its keyness factor with `distinctiveness` > 0. Both factors come from the raw
 * counts, so they don't feed into each other. Words left with a weight of 0
 * (with tf-idf, those in every document) are dropped, so they can't come back
 * as filler.
 */
export function weighCounts(
  docs: Map<string, number>[],
  weighting: 'tf' | 'tfidf',
  distinctiveness: number,
): Map<string, number>[] {
  const positive = docs.map((d) => new Map([...d].filter(([, n]) => n > 0 && Number.isFinite(n))));
  const idf = weighting === 'tfidf' && positive.length > 1 ? inverseDocumentFrequency(positive) : null;
  const keyed = distinctiveness > 0 ? applyKeyness(positive, distinctiveness) : positive;
  return keyed.map(
    (doc) =>
      new Map(
        [...doc]
          .map(([w, n]): [string, number] => [w, idf ? n * idf.get(w)! : n])
          .filter(([, n]) => n > 0 && Number.isFinite(n)),
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
