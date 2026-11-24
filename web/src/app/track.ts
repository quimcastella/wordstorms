/**
 * Usage events for Plausible (stats.afeli.net), loaded in index.html. Each event name is a goal in the
 * dashboard and each prop a custom property. Props are counts in ranges and the site's own settings and
 * example ids, never a document's words, text or file name.
 */

type From = 'own' | string; // 'own', or the id of the example Make your own started from

export type Events = {
  /** An example shown under Explore examples: on arrival (`landed`, from the link or the default) or picked. */
  'Example View': { example: string; how: 'landed' | 'picked' };
  /** "Change this example" or a Start from card: an example opened under Make your own. */
  'Example Tweak': { example: string };
  /** Your own documents added under Make your own. */
  'Documents Add': { source: 'files' | 'drop' | 'paste'; documents: string };
  /** A storm built under Make your own, once per set of documents (not on every setting change). */
  'Storm Made': { from: From; documents: string; words: string; language: string; mode: string; seconds: string };
  /** A setting changed under Make your own; `value` only for settings with a few named choices. */
  'Setting Change': { setting: string; value?: string };
  /** A word clicked to pin it in every cloud. */
  'Word Pin': Record<string, never>;
  'Download': { format: 'svg' | 'png' | 'json'; from: From; documents: string };
  'Copy BibTeX': Record<string, never>;
  /** Plausible's standard name for outbound link clicks. */
  'Outbound Link: Click': { url: string };
  'Error': { kind: 'not-text' | 'example' | 'storm' | 'download' };
};

type Plausible = (event: string, options?: { props?: Record<string, string> }) => void;

export function track<E extends keyof Events>(event: E, ...[props]: Events[E] extends Record<string, never> ? [] : [Events[E]]) {
  const plausible = (globalThis as { plausible?: Plausible }).plausible;
  if (!plausible) return;
  const clean = props && Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined));
  plausible(event, clean ? { props: clean as Record<string, string> } : undefined);
}

// Counts go in ranges, so events carry their size, not the exact number.

/** How many documents: `'1'` to `'5'`, then `'6-10'`, `'11-20'` or `'21+'`. */
export const documentsBucket = (n: number) => (n <= 5 ? String(n) : n <= 10 ? '6-10' : n <= 20 ? '11-20' : '21+');

/** Total words in the documents: `'<1k'`, `'1k-10k'`, `'10k-100k'`, `'100k-1M'` or `'1M+'`. */
export const wordsBucket = (n: number) =>
  n < 1e3 ? '<1k' : n < 1e4 ? '1k-10k' : n < 1e5 ? '10k-100k' : n < 1e6 ? '100k-1M' : '1M+';

/** How long a storm took to build: `'<1'`, `'1-3'`, `'3-10'` or `'10+'` seconds. */
export const secondsBucket = (ms: number) => (ms < 1000 ? '<1' : ms < 3000 ? '1-3' : ms < 10000 ? '3-10' : '10+');
