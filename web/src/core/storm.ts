import { Board } from './board.ts';
import { hsbToHex } from './color.ts';
import { boxMask, type Angle, type Glyph, type GlyphMeasurer, type Mask } from './glyph.ts';
import { PALETTES, type Palette, type PaletteName } from './palettes.ts';
import { createRng, type Rng } from './random.ts';
import { STOPWORDS, type StopwordLanguage } from './stopwords.ts';
import { countWords, normalizeWeights, sortCounts, weighCounts, type Morphology, type TextCase } from './text.ts';

/** A document given as text: its words are counted with the storm's text options. */
export interface TextDoc {
  name: string;
  text: string;
  words?: undefined;
}

/**
 * A document given as word weights (counts, scores, anything positive), for
 * text processed elsewhere. They're used as given: no stop words, case folding
 * or word-form clean-up, except that `extraStopwords` still leaves words out.
 */
export interface CountsDoc {
  name: string;
  words: Record<string, number> | Map<string, number>;
  text?: undefined;
}

/** One document, which becomes one cloud. */
export type Doc = TextDoc | CountsDoc;

export type Mode = 'coordinated' | 'independent';

export interface StormOptions {
  /** `coordinated` lays clouds out together (the word storm); `independent` makes ordinary clouds. */
  mode: Mode;
  /** Words per cloud. */
  maxWords: number;
  /** Size of each cloud, in px. */
  width: number;
  height: number;
  minFontSize: number;
  maxFontSize: number;
  seed: number;
  textCase: TextCase;
  /** Stop list: `extended` (default) or `english` (the original's) for English, `spanish`, `catalan`, or `none`. */
  stopwords: StopwordLanguage;
  extraStopwords: string[];
  excludeNumbers: boolean;
  /**
   * Word-form clean-up: `english` (default) merges possessives and plurals,
   * `catalan` splits off elided articles and attached pronouns, `none` keeps tokens as they are.
   */
  morphology: Morphology;
  /** Words shorter than this many characters are left out (default 2, so single letters go). */
  minWordLength: number;
  /** `tfidf` multiplies counts by idf, so words in every document drop out. */
  weighting: 'tf' | 'tfidf';
  /**
   * 0–1: how much to favor words a document uses more than the others do
   * (keyness). Unlike tf-idf, words every document uses stay, so clouds keep
   * shared words to coordinate.
   */
  distinctiveness: number;
  /** Font size grows with count^sizeExponent: 1 is linear (as in the original), above 1 is more dramatic, below 1 evens sizes out. */
  sizeExponent: number;
  /** Share of words drawn vertically (original: 2/7). */
  verticalShare: number;
  /**
   * How words several documents share stand apart from words only one uses.
   * `none` (default): a random palette color per word, as in the original.
   * `weight`: words only one document uses are drawn in the font's light weight.
   * `warmth`: shared words take warm palette colors, the rest cool ones.
   */
  markShared: 'weight' | 'warmth' | 'none';
  /** Coordinated only: words shared by many clouds are drawn more transparent. */
  fadeCommonWords: boolean;
  /** Word colors and background; `classic` is the original random HSB coloring. */
  palette: PaletteName;
  /** Coordinated only: a word has converged when it is within this many px of its average position (−1: one pass). */
  tolerance: number;
  /** Coordinated only: maximum passes of the iterative phase. */
  maxIterations: number;
  /** Coordinated only: safety cap on force-phase iterations. */
  maxForceIterations: number;
}

export const DEFAULT_OPTIONS: StormOptions = {
  mode: 'coordinated',
  maxWords: 35,
  width: 640,
  height: 480,
  minFontSize: 8,
  maxFontSize: 65,
  seed: 123456,
  textCase: 'lower',
  stopwords: 'extended',
  extraStopwords: [],
  excludeNumbers: true,
  morphology: 'english',
  minWordLength: 2,
  weighting: 'tf',
  distinctiveness: 0.2,
  sizeExponent: 1,
  verticalShare: 2 / 7,
  markShared: 'none',
  fadeCommonWords: false,
  palette: 'storm',
  tolerance: 50,
  maxIterations: 5,
  maxForceIterations: 20000,
};

/** The settings used in the paper: plain counts, 25 words, the original stop list and colors. */
export const PAPER_OPTIONS: Partial<StormOptions> = {
  maxWords: 25,
  stopwords: 'english',
  distinctiveness: 0,
  sizeExponent: 1,
  verticalShare: 2 / 7,
  markShared: 'none',
  fadeCommonWords: true,
  palette: 'classic',
};

export interface PlacedWord {
  text: string;
  /** Relative importance in its cloud (mean 0.6). */
  weight: number;
  fontSize: number;
  angle: Angle;
  color: string;
  opacity: number;
  /** Drawn in the font's light weight (with `markShared: 'weight'`, words only one cloud has). */
  light: boolean;
  /** Top-left of the ink's bounding box. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Text origin relative to (x, y), for rendering. */
  originX: number;
  originY: number;
  /** Number of clouds this word appears in. */
  cloudCount: number;
}

export interface Cloud {
  name: string;
  words: PlacedWord[];
  /** Words that could not be placed. */
  skipped: string[];
}

export interface StormStats {
  passes: number;
  forceIterations: number;
  /** False if the force phase stopped at `maxForceIterations` instead of settling (always true for separate clouds). */
  forceConverged: boolean;
  /** Factor applied to font sizes so everything fit during layout. */
  shrink: number;
  /** Words chosen across all clouds, and how many of them were placed (the rest are in `skipped`). */
  selectedWords: number;
  placedWords: number;
  /**
   * How far apart a shared word's copies are, in px of the output frame: for every word placed in
   * two or more clouds, the distance from each copy's center to the mean of its copies' centers.
   * Lower is better aligned; 0 when there are no shared words.
   */
  sharedOffset: { mean: number; max: number };
  /**
   * Overlaps the force phase left behind. Shared words in a storm are the only words moved without
   * a collision check, so they're the only ones that can overlap: `pairs` of shared words in one
   * cloud whose boxes intersect, and the deepest such overlap, in px of the output frame. Always 0
   * for separate clouds.
   */
  overlap: { pairs: number; maxDepth: number };
  millis: number;
}

export interface Storm {
  width: number;
  height: number;
  /** Background color the palette was designed for. */
  background: string;
  clouds: Cloud[];
  stats: StormStats;
  /** Every option the storm was made with, defaults included, so it can be made again. */
  options: StormOptions;
}

export type Progress = (message: string) => void;

const MAX_ATTEMPTS = 5000;
/**
 * Placement passes shrink every word by 0.9 when one doesn't fit. Below this
 * factor they stop shrinking and leave out (skip) words that still don't fit,
 * so a storm that can't fit ends instead of looping forever.
 */
const MIN_SIZE_FACTOR = 0.1;
/** Largest cloud side, in px: the layout keeps a bitmap a few times this size. */
export const MAX_SIZE = 16384;

/** Every `StormOptions` value, checked; throws a RangeError or TypeError naming the first bad one. */
export function resolveOptions(options: Partial<StormOptions> = {}): StormOptions {
  const opts: StormOptions = { ...DEFAULT_OPTIONS };
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) (opts as unknown as Record<string, unknown>)[key] = value;
  }
  const bad = (name: keyof StormOptions, expected: string): never => {
    throw new RangeError(`Invalid option ${name}: expected ${expected}, got ${JSON.stringify(opts[name])}.`);
  };
  const number = (name: keyof StormOptions, min: number, max: number, integer = false) => {
    const v = opts[name];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
      bad(name, `${integer ? 'an integer' : 'a number'} from ${min} to ${max}`);
    }
  };
  const oneOf = (name: keyof StormOptions, values: readonly unknown[]) => {
    if (!values.includes(opts[name])) bad(name, `one of ${values.map((v) => JSON.stringify(v)).join(', ')}`);
  };
  const boolean = (name: keyof StormOptions) => {
    if (typeof opts[name] !== 'boolean') bad(name, 'true or false');
  };

  oneOf('mode', ['coordinated', 'independent']);
  number('maxWords', 1, 10000, true);
  number('width', 1, MAX_SIZE);
  number('height', 1, MAX_SIZE);
  number('minFontSize', 0.1, 10000);
  number('maxFontSize', opts.minFontSize, 10000);
  number('seed', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  oneOf('textCase', ['lower', 'upper', 'asis']);
  oneOf('stopwords', Object.keys(STOPWORDS));
  if (!Array.isArray(opts.extraStopwords) || !opts.extraStopwords.every((w) => typeof w === 'string')) {
    bad('extraStopwords', 'an array of strings');
  }
  boolean('excludeNumbers');
  oneOf('morphology', ['english', 'catalan', 'none']);
  number('minWordLength', 1, 100, true);
  oneOf('weighting', ['tf', 'tfidf']);
  number('distinctiveness', 0, 1);
  number('sizeExponent', 0.01, 10);
  number('verticalShare', 0, 1);
  oneOf('markShared', ['none', 'weight', 'warmth']);
  boolean('fadeCommonWords');
  oneOf('palette', Object.keys(PALETTES));
  number('tolerance', -1, Number.MAX_SAFE_INTEGER);
  number('maxIterations', 1, 1000, true);
  number('maxForceIterations', 1, 10_000_000, true);
  return opts;
}

function checkDocs(docs: Doc[]): void {
  if (!Array.isArray(docs)) throw new TypeError('generateStorm expects an array of documents.');
  docs.forEach((d, i) => {
    if (!d || typeof d.name !== 'string') throw new TypeError(`Document ${i} must have a string name.`);
    const doc = `Document ${i} ("${d.name}")`;
    if (d.words === undefined) {
      if (typeof d.text !== 'string') throw new TypeError(`${doc} needs either text or words.`);
      return;
    }
    if ((d as Doc).text !== undefined) throw new TypeError(`${doc} has both text and words; give one.`);
    if (typeof d.words !== 'object' || d.words === null || Array.isArray(d.words)) {
      throw new TypeError(`${doc}: words must be an object or Map of word → weight.`);
    }
    const entries = d.words instanceof Map ? [...d.words] : Object.entries(d.words);
    for (const [w, n] of entries) {
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
        throw new TypeError(`${doc}: the weight of "${w}" must be a number ≥ 0, not ${JSON.stringify(n)}.`);
      }
    }
  });
}

/** A document's word weights: given ones as they are (NFC, summed if that merges two), or counted from its text. */
function docCounts(d: Doc, opts: StormOptions): Map<string, number> {
  if (d.words === undefined) return countWords(d.text, opts);
  const extra = new Set(opts.extraStopwords.map((w) => w.normalize('NFC').toLowerCase()));
  const counts = new Map<string, number>();
  for (const [w, n] of d.words instanceof Map ? d.words : Object.entries(d.words)) {
    const word = w.normalize('NFC').trim();
    if (!word || extra.has(word.toLowerCase())) continue;
    counts.set(word, (counts.get(word) ?? 0) + n);
  }
  return counts;
}

/** One word across the storm: its copies in every cloud that kept it. */
interface Entry {
  words: WordState[];
  idf: number;
  color?: string;
  angle?: Angle;
}

interface WordState {
  text: string;
  cloud: number;
  /** Weight after normalization; also sets the base font size. */
  weight: number;
  entry: Entry;
  angle: Angle;
  color: string;
  opacity: number;
  light: boolean;
  x: number;
  y: number;
  /** Has a position (shared words keep theirs between passes). */
  placed: boolean;
}

interface Field {
  width: number;
  height: number;
}

/** Builds a word storm: one cloud per document, laid out together. */
export function generateStorm(
  docs: Doc[],
  options: Partial<StormOptions> = {},
  measurer: GlyphMeasurer,
  onProgress: Progress = () => {},
): Storm {
  checkDocs(docs);
  const opts = resolveOptions(options);
  const start = Date.now();
  const rng = createRng(opts.seed);
  const coordinated = opts.mode === 'coordinated';

  onProgress('Counting words');
  const clouds = selectWords(docs, opts);
  assignStyle(clouds, opts, rng, coordinated);

  const layout = new Layout(opts, measurer);
  let passes = 0;
  let forceIterations = 0;
  if (coordinated) {
    // As in the original, the coordinated layout happens on a half-size
    // field with full-size fonts, and the result is scaled to fit at the end.
    const field = { width: opts.width / 2, height: opts.height / 2 };
    const unique = clouds.map((ws) => ws.filter((w) => w.entry.words.length === 1));
    onProgress('Placing shared words');
    passes = layout.iterative(
      clouds.map((ws) => ws.filter((w) => w.entry.words.length > 1)),
      field,
      rng,
    );
    // Shared words that didn't fit even at the smallest size sit out the rest.
    const shared = clouds.map((ws) => ws.filter((w) => w.entry.words.length > 1 && w.placed));
    onProgress('Refining layout');
    forceIterations = layout.force(shared, clouds, field, onProgress);
    onProgress('Placing unique words');
    layout.placeUnique(shared, unique, field);
  } else {
    onProgress('Placing words');
    layout.independent(clouds, { width: opts.width, height: opts.height });
    passes = 1;
  }

  onProgress('Fitting');
  const result = layout.fit(clouds, docs);
  const selectedWords = clouds.reduce((n, ws) => n + ws.length, 0);
  return {
    width: opts.width,
    height: opts.height,
    background: (PALETTES[opts.palette] ?? PALETTES.storm).background,
    clouds: result,
    stats: {
      passes,
      forceIterations,
      forceConverged: !coordinated || forceIterations < opts.maxForceIterations,
      shrink: layout.sizeFactor,
      selectedWords,
      placedWords: result.reduce((n, c) => n + c.words.length, 0),
      sharedOffset: sharedOffset(result),
      overlap: coordinated ? sharedOverlap(result) : { pairs: 0, maxDepth: 0 },
      millis: Date.now() - start,
    },
    options: opts,
  };
}

/** Each document's top words, linked across clouds through a shared Entry per word. */
function selectWords(docs: Doc[], opts: StormOptions): WordState[][] {
  const counts = weighCounts(
    docs.map((d) => docCounts(d, opts)),
    opts.weighting,
    opts.distinctiveness,
  );
  const top = counts.map((c) =>
    normalizeWeights(sortCounts(c).slice(0, opts.maxWords).map(([w, n]): [string, number] => [w, n ** opts.sizeExponent])),
  );

  const entries = new Map<string, Entry>();
  const clouds = top.map((words, cloud) =>
    words.map(([text, weight]) => {
      let entry = entries.get(text);
      if (!entry) entries.set(text, (entry = { words: [], idf: 0 }));
      const w: WordState = {
        text,
        cloud,
        weight,
        entry,
        angle: 0,
        color: '',
        opacity: 1,
        light: false,
        x: 0,
        y: 0,
        placed: false,
      };
      entry.words.push(w);
      return w;
    }),
  );
  const D = clouds.length;
  for (const e of entries.values()) e.idf = D > 1 ? Math.log(D / e.words.length) / Math.log(D) : 1;
  return clouds;
}

function randomAngle(rng: Rng, verticalShare: number): Angle {
  const u = rng.uniform(1);
  return u < verticalShare ? (u < verticalShare / 2 ? 90 : -90) : 0;
}

function randomColor(rng: Rng, colors: readonly string[]): string {
  if (colors.length) return colors[rng.int(colors.length)];
  return hsbToHex(rng.uniform(256) / 256, 200 / 255, (50 + rng.uniform(150)) / 255);
}

/** A warm color for a shared word, a cool one for a word only one cloud has. */
function warmthColor(rng: Rng, palette: Palette, shared: boolean): string {
  const list = shared ? palette.warm : palette.cool;
  if (list.length) return list[rng.int(list.length)];
  // Classic: random HSB, with hue in magenta–red–orange (warm) or green–blue–indigo (cool).
  const hue = shared ? (0.88 + rng.uniform(0.24)) % 1 : 0.4 + rng.uniform(0.32);
  return hsbToHex(hue, 200 / 255, (50 + rng.uniform(150)) / 255);
}

/** Opacity from idf: ~40% for words in every cloud, 100% for distinctive ones. */
export function idfOpacity(idf: number): number {
  return (40 + 60 / (1 + Math.exp(-20 * (idf - 0.2)))) / 100;
}

function assignStyle(
  clouds: WordState[][],
  opts: StormOptions,
  rng: Rng,
  coordinated: boolean,
): void {
  const palette = PALETTES[opts.palette] ?? PALETTES.storm;
  const mark = clouds.length > 1 ? opts.markShared : 'none';
  const color = (e: Entry) =>
    mark === 'warmth' ? warmthColor(rng, palette, e.words.length > 1) : randomColor(rng, palette.colors);
  for (const ws of clouds) {
    for (const w of ws) {
      w.light = mark === 'weight' && w.entry.words.length === 1;
      if (coordinated) {
        const e = w.entry;
        e.angle ??= randomAngle(rng, opts.verticalShare);
        e.color ??= color(e);
        w.angle = e.angle;
        w.color = e.color;
        w.opacity = opts.fadeCommonWords ? idfOpacity(e.idf) : 1;
      } else {
        w.angle = randomAngle(rng, opts.verticalShare);
        w.color = color(w.entry);
      }
    }
  }
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** The smallest axis-aligned move of `a` that clears `b`. */
function minAxisPush(a: Rect, b: Rect): [number, number] {
  const right = b.x + b.w - a.x;
  const left = a.x + a.w - b.x;
  const down = b.y + b.h - a.y;
  const up = a.y + a.h - b.y;
  let min = Infinity;
  let dir: [number, number] = [0, 0];
  if (right < min) [min, dir] = [right, [right, 0]];
  if (left < min) [min, dir] = [left, [-left, 0]];
  if (down < min) [min, dir] = [down, [0, down]];
  if (up < min) [min, dir] = [up, [0, -up]];
  return dir;
}

function overlapPenalty(a: Rect, b: Rect): number {
  const dx = Math.min(b.x + b.w - a.x, a.x + a.w - b.x);
  const dy = Math.min(b.y + b.h - a.y, a.y + a.h - b.y);
  return Math.max(0, Math.min(dx, dy) + 1) ** 2;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Spiral search from `desired` for a spot where the mask doesn't collide. */
function spiralPlace(
  desired: { x: number; y: number },
  glyph: Glyph,
  mask: Mask,
  board: Board,
  bounds: Field | null,
): { x: number; y: number } | null {
  const w = Math.trunc(glyph.width);
  const h = Math.trunc(glyph.height);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const t = attempt / 600;
    const r = lerp(1, 100, t ** 0.6);
    const theta = lerp(0.5, 0.3, t) * attempt;
    const x = desired.x + Math.cos(theta) * r;
    const y = desired.y + Math.sin(theta) * r;
    if (bounds && (x < 0 || y < 0 || x + w >= bounds.width || y + h >= bounds.height)) continue;
    if (board.collides(mask, x, y)) continue;
    return { x, y };
  }
  return null;
}

/** Gaussian clump around the field center (WordCram's centerClump). */
function clump(rng: Rng, sd: number, field: Field, glyph: Glyph) {
  const one = (limit: number) => Math.round(((rng.gaussian() * sd + 2) / 4) * limit);
  return { x: one(field.width - glyph.width), y: one(field.height - glyph.height) };
}

class Layout {
  /** Shrinks every word when a layout pass runs out of room. */
  sizeFactor = 1;
  private readonly opts: StormOptions;
  private readonly measurer: GlyphMeasurer;
  private readonly boxes = new Map<Glyph, Mask>();

  constructor(opts: StormOptions, measurer: GlyphMeasurer) {
    this.opts = opts;
    this.measurer = measurer;
  }

  fontSize(w: WordState): number {
    return lerp(this.opts.minFontSize, this.opts.maxFontSize, w.weight) * this.sizeFactor;
  }

  glyph(w: WordState): Glyph {
    return this.measurer.measure(w.text, this.fontSize(w), w.angle, w.light);
  }

  private boxMaskFor(g: Glyph): Mask {
    let m = this.boxes.get(g);
    if (!m) {
      m = boxMask(g.width, g.height, 1);
      this.boxes.set(g, m);
    }
    return m;
  }

  /** Phase 1: place shared words at their average position across clouds, repeat until stable. */
  iterative(shared: WordState[][], field: Field, rng: Rng): number {
    const tol = this.opts.tolerance;
    let passes = 0;
    for (;;) {
      passes++;
      this.pass(shared, field, (w, g) => {
        const avg = average(w.entry);
        return avg ?? clump(rng, 0.2, field, g);
      });
      if (tol < 0 || passes >= this.opts.maxIterations) break;
      let notConverged = 0;
      for (const ws of shared) {
        for (const w of ws) {
          if (!w.placed) continue;
          const avg = average(w.entry)!;
          if (Math.hypot(w.x - avg.x, w.y - avg.y) > tol) notConverged++;
        }
      }
      if (notConverged === 0) break;
    }
    return passes;
  }

  /**
   * One placement pass over every cloud; restarts smaller if any word doesn't fit.
   * Once words are at `MIN_SIZE_FACTOR`, words that don't fit are left unplaced instead.
   */
  private pass(
    clouds: WordState[][],
    field: Field,
    desired: (w: WordState, g: Glyph) => { x: number; y: number },
    collision: 'box' | 'glyph' = 'box',
  ): void {
    restart: for (;;) {
      for (const ws of clouds) {
        const board = new Board(field.width, field.height);
        const found: [WordState, { x: number; y: number } | null][] = [];
        for (const w of ws) {
          const g = this.glyph(w);
          const mask = collision === 'box' ? this.boxMaskFor(g) : g.mask;
          const p = spiralPlace(desired(w, g), g, mask, board, field);
          if (!p && this.sizeFactor * 0.9 >= MIN_SIZE_FACTOR) {
            this.sizeFactor *= 0.9;
            continue restart;
          }
          if (p) board.add(mask, p.x, p.y);
          found.push([w, p]);
        }
        for (const [w, p] of found) {
          w.placed = p !== null;
          if (p) {
            w.x = p.x;
            w.y = p.y;
          }
        }
      }
      return;
    }
  }

  /** Phase 2: gradient steps balancing cross-cloud consistency, overlap and compactness. */
  force(shared: WordState[][], all: WordState[][], field: Field, onProgress: Progress): number {
    const D = shared.length;
    const center = { x: field.width / 2, y: field.height / 2 };
    const sizeOf = new Map<WordState, { w: number; h: number }>();
    for (const ws of shared) {
      for (const w of ws) {
        const g = this.glyph(w);
        sizeOf.set(w, { w: g.width, h: g.height });
      }
    }
    // Rectangle used for push directions and penalties (as in the original: bounds + 1 px).
    const rect = (w: WordState): Rect => {
      const s = sizeOf.get(w)!;
      return { x: w.x, y: w.y, w: s.w + 1, h: s.h + 1 };
    };
    // Rectangle used to detect overlaps (as in the original: integer box swollen by 1 px).
    const hitRect = (w: WordState): Rect => {
      const s = sizeOf.get(w)!;
      return { x: Math.trunc(w.x) - 1, y: Math.trunc(w.y) - 1, w: Math.trunc(s.w) + 2, h: Math.trunc(s.h) + 2 };
    };

    // How different two clouds' texts are (all their words), and how different
    // their shared words' sizes are; neither changes during this phase.
    const docDis = pairwise(D, (i, j) => weightDistance(all[i], all[j], 1));
    const sizeDis = pairwise(D, (i, j) => weightDistance(shared[i], shared[j], this.sizeFactor));
    const S: number[][] = Array.from({ length: D }, () => new Array<number>(D).fill(0));
    const stress = () => {
      for (let i = 0; i < D; i++) {
        for (let j = i + 1; j < D; j++) {
          const cloudDis = sizeDis[i][j] + positionDistance(shared[i], shared[j]);
          const dd = docDis[i][j] === 0 ? 1 : docDis[i][j];
          S[i][j] = S[j][i] = (docDis[i][j] - cloudDis) / dd;
        }
      }
    };
    let overlaps: Map<WordState, WordState[]>[] = shared.map(() => new Map());

    const move = (overEps: number, sameEps: number, compEps: number) => {
      stress();
      let gradient = 0;
      for (let c = 0; c < D; c++) {
        const next = shared[c].map((w) => {
          let sx = 0;
          let sy = 0;
          if (sameEps > 0.001) {
            for (const other of w.entry.words) {
              if (other.cloud === c || !other.placed) continue;
              const k = 1e-6 * S[other.cloud][c] * sameEps;
              sx -= k * (w.x - other.x);
              sy -= k * (w.y - other.y);
            }
          }
          if (overEps > 0.001) {
            const r = rect(w);
            for (const o of overlaps[c].get(w) ?? []) {
              const [dx, dy] = minAxisPush(r, rect(o));
              sx -= 0.1 * overEps * dx;
              sy -= 0.1 * overEps * dy;
            }
          }
          if (compEps > 0.001) {
            let cx = w.x - center.x;
            let cy = w.y - center.y;
            const len = Math.hypot(cx, cy);
            if (len > 1) [cx, cy] = [cx / len, cy / len];
            sx += 0.1 * compEps * cx;
            sy += 0.1 * compEps * cy;
          }
          const len = Math.hypot(sx, sy);
          if (len > 30) [sx, sy] = [(sx / len) * 30, (sy / len) * 30];
          gradient = Math.max(gradient, Math.min(len, 30));
          return { x: w.x - sx, y: w.y - sy };
        });
        shared[c].forEach((w, i) => {
          w.x = next[i].x;
          w.y = next[i].y;
        });
        overlaps[c] = findOverlaps(shared[c], hitRect);
      }
      let maxOverlap = 0;
      for (let c = 0; c < D; c++) {
        for (const [w, os] of overlaps[c]) {
          for (const o of os) maxOverlap = Math.max(maxOverlap, overlapPenalty(rect(w), rect(o)));
        }
      }
      return { gradient, maxOverlap };
    };

    // Stages from the original's Combined algorithm: the weights of the overlap,
    // same-word and compactness forces, and the gradient below which the stage ends.
    const schedule: [number, number, number, number][] = [
      [0, 1, 0, 0.2],
      [0.1, 1, 0.5, 0.2],
      [0, 1, 0, 0.2],
      [1, 1, 0.5, 0.2],
      [1, 0.1, 0.5, 0.2],
      [1, 0, 0.9, 0.1001],
      [10, 0, 0, 0.01],
    ];
    // A first step with every force on finds the initial overlaps.
    let state = move(1, 1, 1);
    let iterations = 1;
    schedule.forEach(([over, same, comp, stop], s) => {
      const last = s === schedule.length - 1;
      let gradient = 100;
      let prev = 100;
      // The last stage ends once overlaps are small, or the gradient stays below `stop` for two steps.
      const done = () => (last ? state.maxOverlap < 10 || (gradient < stop && prev < stop) : gradient < stop);
      while (!done() && iterations < this.opts.maxForceIterations) {
        prev = gradient;
        state = move(over, same, comp);
        gradient = state.gradient;
        iterations++;
        if (iterations % 200 === 0) onProgress(`Refining layout (stage ${s + 1}/${schedule.length}, step ${iterations})`);
      }
    });
    return iterations;
  }

  /** Phase 3: fit each cloud's unique words around its (now fixed) shared words. */
  placeUnique(shared: WordState[][], unique: WordState[][], field: Field): void {
    shared.forEach((ws, c) => {
      const board = new Board(field.width, field.height);
      for (const w of ws) board.add(this.glyph(w).mask, w.x, w.y);
      const rng = createRng(this.opts.seed);
      for (const w of unique[c]) {
        const g = this.glyph(w);
        const p = spiralPlace(clump(rng, 0.4, field, g), g, g.mask, board, null);
        if (!p) continue;
        board.add(g.mask, p.x, p.y);
        w.x = p.x;
        w.y = p.y;
        w.placed = true;
      }
    });
  }

  /** Independent clouds: every word placed on its own, Wordle style. */
  independent(clouds: WordState[][], field: Field): void {
    const rngs = clouds.map((_, c) => createRng(this.opts.seed + c));
    const desired = (w: WordState, g: Glyph) => clump(rngs[w.cloud], 0.4, field, g);
    this.pass(clouds, field, desired, 'glyph');
  }

  /** Scales and centers every cloud by the same transform so the union of all clouds fits. */
  fit(clouds: WordState[][], docs: Doc[]): Cloud[] {
    const pad = 2;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const ws of clouds) {
      for (const w of ws) {
        if (!w.placed) continue;
        const g = this.glyph(w);
        minX = Math.min(minX, w.x - pad);
        minY = Math.min(minY, w.y - pad);
        maxX = Math.max(maxX, w.x + g.width + pad);
        maxY = Math.max(maxY, w.y + g.height + pad);
      }
    }
    const { width, height } = this.opts;
    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;
    const scale = Math.min(width / bw, height / bh);
    const dx = (width - bw * scale) / 2;
    const dy = (height - bh * scale) / 2;
    return clouds.map((ws, c) => ({
      name: docs[c].name,
      skipped: ws.filter((w) => !w.placed).map((w) => w.text),
      words: ws
        .filter((w) => w.placed)
        .map((w): PlacedWord => {
          const g = this.glyph(w);
          return {
            text: w.text,
            weight: w.weight,
            fontSize: this.fontSize(w) * scale,
            angle: w.angle,
            color: w.color,
            opacity: w.opacity,
            light: w.light,
            x: (w.x - minX) * scale + dx,
            y: (w.y - minY) * scale + dy,
            width: g.width * scale,
            height: g.height * scale,
            originX: g.originX * scale,
            originY: g.originY * scale,
            cloudCount: w.entry.words.length,
          };
        }),
    }));
  }
}

/** See `StormStats.sharedOffset`. */
export function sharedOffset(clouds: Cloud[]): { mean: number; max: number } {
  const copies = new Map<string, { x: number; y: number }[]>();
  for (const c of clouds) {
    for (const w of c.words) {
      let list = copies.get(w.text);
      if (!list) copies.set(w.text, (list = []));
      list.push({ x: w.x + w.width / 2, y: w.y + w.height / 2 });
    }
  }
  let sum = 0;
  let max = 0;
  let n = 0;
  for (const list of copies.values()) {
    if (list.length < 2) continue;
    const cx = list.reduce((s, p) => s + p.x, 0) / list.length;
    const cy = list.reduce((s, p) => s + p.y, 0) / list.length;
    for (const p of list) {
      const d = Math.hypot(p.x - cx, p.y - cy);
      sum += d;
      max = Math.max(max, d);
      n++;
    }
  }
  return { mean: n ? sum / n : 0, max };
}

/** See `StormStats.overlap`. */
export function sharedOverlap(clouds: Cloud[]): { pairs: number; maxDepth: number } {
  let pairs = 0;
  let maxDepth = 0;
  for (const c of clouds) {
    const shared = c.words.filter((w) => w.cloudCount > 1);
    for (let i = 0; i < shared.length; i++) {
      for (let j = i + 1; j < shared.length; j++) {
        const a = shared[i];
        const b = shared[j];
        const dx = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const dy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (dx <= 0 || dy <= 0) continue;
        pairs++;
        maxDepth = Math.max(maxDepth, Math.min(dx, dy));
      }
    }
  }
  return { pairs, maxDepth };
}

function average(e: Entry): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const w of e.words) {
    if (!w.placed) continue;
    x += w.x;
    y += w.y;
    n++;
  }
  return n === 0 ? null : { x: x / n, y: y / n };
}

function pairwise(n: number, f: (i: number, j: number) => number): number[][] {
  const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) m[i][j] = m[j][i] = f(i, j);
  return m;
}

/** Σ (weight_a − weight_b)² over the union of words (missing = 0). */
function weightDistance(a: WordState[], b: WordState[], factor: number): number {
  const wb = new Map(b.map((w) => [w.text, w.weight * factor]));
  let sum = 0;
  for (const w of a) {
    const v = w.weight * factor - (wb.get(w.text) ?? 0);
    sum += v * v;
    wb.delete(w.text);
  }
  for (const v of wb.values()) sum += v * v;
  return sum;
}

/** Σ squared distance between the positions of words both clouds share. */
function positionDistance(a: WordState[], b: WordState[]): number {
  const pb = new Map(b.map((w) => [w.text, w]));
  let sum = 0;
  for (const w of a) {
    const o = pb.get(w.text);
    if (o) sum += (w.x - o.x) ** 2 + (w.y - o.y) ** 2;
  }
  return sum;
}

function findOverlaps(ws: WordState[], rect: (w: WordState) => Rect): Map<WordState, WordState[]> {
  const out = new Map<WordState, WordState[]>(ws.map((w) => [w, []]));
  const rects = ws.map(rect);
  for (let i = 0; i < ws.length; i++) {
    for (let j = i + 1; j < ws.length; j++) {
      if (intersects(rects[i], rects[j])) {
        out.get(ws[i])!.push(ws[j]);
        out.get(ws[j])!.push(ws[i]);
      }
    }
  }
  return out;
}
