import type { StormOptions } from './storm.ts';

/**
 * Text settings per language, for a single "language" choice in a UI or on the command line.
 * `none` turns every language-specific step off: no stop words, no word-form
 * clean-up, and single-letter words (such as C or R) are kept.
 */
export const LANGUAGES = {
  english: { stopwords: 'extended', morphology: 'english', minWordLength: 2 },
  spanish: { stopwords: 'spanish', morphology: 'none', minWordLength: 2 },
  catalan: { stopwords: 'catalan', morphology: 'catalan', minWordLength: 2 },
  none: { stopwords: 'none', morphology: 'none', minWordLength: 1 },
} as const satisfies Record<string, Pick<StormOptions, 'stopwords' | 'morphology' | 'minWordLength'>>;

export type Language = keyof typeof LANGUAGES;
