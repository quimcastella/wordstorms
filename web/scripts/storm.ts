#!/usr/bin/env node
// Makes a word storm from text files on the command line: one SVG and/or PNG
// per cloud, all in the same frame, an index.html showing them side by side,
// and optionally the layout as JSON.
//
//   wordstorms [options] <files or folders...>       (installed, or with npx)
//   npm run storm -- [options] <files or folders...> (from web/ in a clone)
//
// Run with --help for the options. `npm run build:cli` bundles this file into
// dist-cli/wordstorms.js, which is what the published package runs.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { LANGUAGES, type Language } from '../src/core/language.ts';
import { PALETTES, type PaletteName } from '../src/core/palettes.ts';
import { DEFAULT_OPTIONS, generateStorm, MAX_SIZE, type Cloud, type Doc, type Storm, type StormOptions } from '../src/core/storm.ts';
import { createCanvasMeasurer, fontWeight, type FontSpec } from '../src/measure/canvas.ts';
import { drawCloud } from '../src/render/canvas.ts';
import { cloudFileNames, cropStorm, stormToJson } from '../src/render/export.ts';
import { VERSION } from '../src/core/version.ts';
import { stormToHtml } from '../src/render/html.ts';
import { cloudToSvg } from '../src/render/svg.ts';
import { EXAMPLES } from '../src/app/example-list.ts';
import { FONT_LIST, LATIN, LATIN_EXT, type FontInfo } from '../src/app/font-list.ts';

const here = dirname(fileURLToPath(import.meta.url));
// `npm run` starts scripts in web/; INIT_CWD is where the user ran it from.
const cwd = process.env.INIT_CWD ?? process.cwd();
const MARKS = ['none', 'weight', 'warmth'] as const;

const HELP = `Make a word storm from text files: one cloud per file.

Usage:
  wordstorms [options] <files or folders...>
  wordstorms --example <${EXAMPLES.map((e) => e.id).join('|')}> [options]

Examples:
  wordstorms speeches/                 One cloud per .txt or .md file in a folder
  wordstorms a.txt b.txt -w 50 -p ocean
  wordstorms --example shakespeare     A built-in example, in its own look

Options:
  -o, --out <dir>        Where to write the files (default: ./wordstorm)
  -f, --format <list>    Any of svg, png, html and json, comma-separated (default: svg,png,html)
      --separate         Lay out each cloud on its own instead of as a storm
      --no-crop          Keep the full --size frame instead of cropping to the words
      --scale <n>        PNG pixels per layout pixel, 0.25–8 (default: 2)
  -w, --words <n>        Words per cloud (default: ${DEFAULT_OPTIONS.maxWords})
  -d, --distinct <n>     Favor words a document uses more than the others, 0–100 (default: ${DEFAULT_OPTIONS.distinctiveness * 100})
      --contrast <n>     Size differences, 0.1–3: 1 is the original scale, higher is more dramatic (default: 1)
      --vertical <0-1>   Share of vertical words (default: 0.29)
      --mark <how>       Set shared words apart: ${MARKS.join(', ')} (default: none)
  -p, --palette <name>   ${Object.keys(PALETTES).join(', ')} (default: ${DEFAULT_OPTIONS.palette})
      --font <id>        ${FONT_LIST.map((f) => f.id).join(', ')} (default: ${FONT_LIST[0].id})
      --size <WxH>       Cloud size in pixels (default: ${DEFAULT_OPTIONS.width}x${DEFAULT_OPTIONS.height})
      --language <name>  ${Object.keys(LANGUAGES).join(', ')}: which common words to leave out and how
                         to clean up word forms; none keeps every word as written (default: english)
      --ignore <words>   Extra words to leave out, comma-separated
  -s, --seed <n>         Layout number; the same number gives the same layout (default: ${DEFAULT_OPTIONS.seed})
      --example <id>     Use a built-in example's documents and look instead of files; other options override it
  -v, --version          Show the version
  -h, --help             Show this help

Folders are read for .txt and .md files. Each file name becomes its cloud's title.`;

function fail(message: string): never {
  console.error(`Error: ${message}\nRun with --help for the options.`);
  process.exit(1);
}

/** Runs `f`, turning any error it throws into a short message instead of a stack trace. */
function attempt<T>(f: () => T, context = ''): T {
  try {
    return f();
  } catch (err) {
    fail(`${context}${err instanceof Error ? err.message : String(err)}`);
  }
}

const { values: args, positionals } = attempt(() => parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o' },
    format: { type: 'string', short: 'f' },
    separate: { type: 'boolean' },
    'no-crop': { type: 'boolean' },
    scale: { type: 'string' },
    words: { type: 'string', short: 'w' },
    distinct: { type: 'string', short: 'd' },
    contrast: { type: 'string' },
    vertical: { type: 'string' },
    mark: { type: 'string' },
    palette: { type: 'string', short: 'p' },
    font: { type: 'string' },
    size: { type: 'string' },
    language: { type: 'string' },
    ignore: { type: 'string' },
    seed: { type: 'string', short: 's' },
    example: { type: 'string' },
    version: { type: 'boolean', short: 'v' },
    help: { type: 'boolean', short: 'h' },
  },
}));

if (args.help) {
  console.log(HELP);
  process.exit(0);
}
if (args.version) {
  console.log(VERSION);
  process.exit(0);
}

const number = (name: string, value: string | undefined, min: number, max: number, integer = false): number | undefined => {
  if (value === undefined) return undefined;
  const n = value.trim() === '' ? NaN : Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    fail(`--${name} must be ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}, not "${value}".`);
  }
  return n;
};

// ---------- Documents ----------

function readDocs(paths: string[]): Doc[] {
  const files = paths.flatMap((given) => {
    const p = resolve(cwd, given);
    if (!existsSync(p)) fail(`No such file or folder: ${given}`);
    if (!statSync(p).isDirectory()) return [p];
    return readdirSync(p)
      .filter((f) => /\.(txt|md)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => join(p, f));
  });
  return files.map((f) => ({ name: basename(f, extname(f)), text: readFileSync(f, 'utf8') }));
}

const example = args.example ? EXAMPLES.find((e) => e.id === args.example) : undefined;
if (args.example && !example) fail(`Unknown example "${args.example}". Pick one of: ${EXAMPLES.map((e) => e.id).join(', ')}.`);
if (example && positionals.length) {
  fail(`--example uses its own documents, so it can't be combined with files or folders (${positionals.join(', ')}).`);
}

if (!example && positionals.length === 0) {
  console.error(HELP);
  process.exit(1);
}

// The examples sit next to the bundled CLI, or at the repository root when run from source.
const examplesDir = [join(here, 'examples'), join(here, '..', '..', 'examples')].find((d) => existsSync(d));
const docs = example
  ? example.docs.map((name) => ({ name, text: readFileSync(join(examplesDir ?? '', example.folder, `${name}.txt`), 'utf8') }))
  : attempt(() => readDocs(positionals), "Couldn't read the documents: ");
if (docs.length === 0) fail('No .txt or .md files found. Give some text files or a folder, one document per file.');

// ---------- Options ----------

const FORMATS = ['svg', 'png', 'html', 'json'];
const formats = (args.format ?? 'svg,png,html').split(',').map((f) => f.trim().toLowerCase());
for (const f of formats) if (!FORMATS.includes(f)) fail(`Unknown format "${f}". Use any of ${FORMATS.join(', ')}.`);

if (args.palette && !(args.palette in PALETTES)) fail(`Unknown palette "${args.palette}". Pick one of: ${Object.keys(PALETTES).join(', ')}.`);
if (args.mark && !(MARKS as readonly string[]).includes(args.mark)) fail(`--mark must be one of: ${MARKS.join(', ')}.`);
if (args.language && !(args.language in LANGUAGES)) {
  fail(`Unknown language "${args.language}". Pick one of: ${Object.keys(LANGUAGES).join(', ')}.`);
}
const font: FontInfo =
  FONT_LIST.find((f) => f.id === (args.font ?? example?.look.font ?? FONT_LIST[0].id)) ??
  fail(`Unknown font "${args.font}". Pick one of: ${FONT_LIST.map((f) => f.id).join(', ')}.`);

let size: { width: number; height: number } | undefined;
if (args.size) {
  const m = /^(\d+)x(\d+)$/i.exec(args.size.trim());
  if (!m) fail(`--size must look like 640x480, not "${args.size}".`);
  size = { width: Number(m[1]), height: Number(m[2]) };
  if (Math.min(size.width, size.height) < 16 || Math.max(size.width, size.height) > MAX_SIZE) {
    fail(`--size must be from 16x16 to ${MAX_SIZE}x${MAX_SIZE}, not "${args.size}".`);
  }
}

/** PNG pixels per layout pixel. */
const scale = number('scale', args.scale, 0.25, 8) ?? 2;

const given: Partial<StormOptions> = {
  mode: args.separate ? 'independent' : undefined,
  maxWords: number('words', args.words, 1, 500, true),
  distinctiveness: args.distinct === undefined ? undefined : number('distinct', args.distinct, 0, 100)! / 100,
  sizeExponent: number('contrast', args.contrast, 0.1, 3),
  verticalShare: number('vertical', args.vertical, 0, 1),
  markShared: args.mark as StormOptions['markShared'] | undefined,
  palette: args.palette as PaletteName | undefined,
  seed: number('seed', args.seed, 0, Number.MAX_SAFE_INTEGER, true),
  ...(args.language ? LANGUAGES[args.language as Language] : {}),
  ...size,
};
const options: Partial<StormOptions> = {
  ...example?.look.options,
  ...Object.fromEntries(Object.entries(given).filter(([, v]) => v !== undefined)),
  extraStopwords: [...(example?.look.ignore ?? []), ...(args.ignore ?? '').split(/[\s,;]+/).filter(Boolean)],
};

// ---------- Fonts ----------

const fontFile = (f: FontInfo, weight: number, subset: 'latin' | 'latin-ext') =>
  fileURLToPath(import.meta.resolve(`@fontsource/${f.package}/files/${f.package}-${subset}-${weight}-normal.woff2`));
const weights = (spec: FontSpec) => [...new Set([fontWeight(spec), fontWeight(spec, true)])];

// Register the font so text is measured and drawn with it.
if (font.package) for (const w of weights(font.spec)) GlobalFonts.registerFromPath(fontFile(font, w, 'latin'), font.face);

/** @font-face rules with the font inlined, so the SVGs look right anywhere. */
function embeddedCss(f: FontInfo): string {
  if (!f.package) return '';
  return weights(f.spec)
    .flatMap((w) =>
      (['latin', 'latin-ext'] as const).map((subset) => {
        const data = readFileSync(fontFile(f, w, subset)).toString('base64');
        const range = subset === 'latin' ? LATIN : LATIN_EXT;
        return `@font-face{font-family:"${f.face}";font-weight:${w};src:url(data:font/woff2;base64,${data}) format("woff2");unicode-range:${range}}`;
      }),
    )
    .join('');
}

// ---------- Layout and output ----------

const started = performance.now();
// Progress on one updating line, only when someone is watching.
const progress = process.stderr.isTTY ? (m: string) => process.stderr.write(`\r\x1b[K${m}…`) : undefined;
const storm: Storm = attempt(() => generateStorm(docs, options, createCanvasMeasurer((w, h) => createCanvas(w, h), font.spec), progress));
if (progress) process.stderr.write('\r\x1b[K');

function pngOf(cloud: Cloud, width: number, height: number, scale = 2): Buffer {
  const canvas = createCanvas(Math.round(width * scale), Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = storm.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCloud(ctx, cloud, font.spec, { scale });
  return canvas.toBuffer('image/png');
}

const out = resolve(cwd, args.out ?? 'wordstorm');
attempt(() => mkdirSync(out, { recursive: true }), `Couldn't create ${out}: `);
// Every file uses the same frame: cropped to the words, unless --no-crop.
const crop = !args['no-crop'];
const { clouds, width, height } = crop ? cropStorm(storm) : storm;
const written: string[] = [];
const write = (name: string, data: string | Buffer) => {
  attempt(() => writeFileSync(join(out, name), data), `Couldn't write ${name}: `);
  written.push(name);
};
const css = formats.includes('svg') || formats.includes('html') ? embeddedCss(font) : '';
if (formats.includes('svg')) {
  cloudFileNames(storm, 'svg').forEach((name, i) =>
    write(name, cloudToSvg(clouds[i], width, height, { font: font.spec, css, background: storm.background })),
  );
}
if (formats.includes('png')) {
  cloudFileNames(storm, 'png').forEach((name, i) => write(name, pngOf(clouds[i], width, height, scale)));
}
if (formats.includes('html')) {
  const title = example ? example.title : undefined;
  write('index.html', stormToHtml({ clouds, width, height, background: storm.background }, { font: font.spec, css, title }));
}
if (formats.includes('json')) write('storm.json', stormToJson(storm, { crop, font: { id: font.id, ...font.spec } }));

const shared = new Set(storm.clouds.flatMap((c) => c.words.filter((w) => w.cloudCount > 1).map((w) => w.text))).size;
const skipped = storm.clouds.reduce((n, c) => n + c.skipped.length, 0);
console.log(
  `${storm.clouds.length} clouds, ${shared} shared words${skipped ? `, ${skipped} words didn't fit` : ''}, ` +
    `in ${((performance.now() - started) / 1000).toFixed(1)} s`,
);
console.log(`Wrote ${written.length} ${written.length === 1 ? 'file' : 'files'} to ${out}`);
if (written.includes('index.html')) console.log(`Open ${join(out, 'index.html')} to compare the clouds.`);
