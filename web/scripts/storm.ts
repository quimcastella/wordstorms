// Makes a word storm from text files on the command line: one SVG and/or PNG
// per cloud, all in the same frame, plus the layout as JSON.
//
//   npm run storm -- [options] <files or folders...>
//   npm run storm -- --example shakespeare [options]
//
// Run with --help for the options.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { PALETTES, type PaletteName } from '../src/core/palettes.ts';
import { DEFAULT_OPTIONS, generateStorm, type Cloud, type Doc, type StormOptions } from '../src/core/storm.ts';
import { createCanvasMeasurer, fontWeight, type FontSpec } from '../src/measure/canvas.ts';
import { drawCloud } from '../src/render/canvas.ts';
import { cloudFileNames, cropStorm } from '../src/render/export.ts';
import { cloudToSvg } from '../src/render/svg.ts';
import { EXAMPLES } from '../src/app/example-list.ts';
import { FONT_LIST, LATIN, LATIN_EXT, type FontInfo } from '../src/app/font-list.ts';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..');
const MARKS = ['none', 'weight', 'warmth'] as const;

const HELP = `Make a word storm from text files: one cloud per file.

Usage:
  npm run storm -- [options] <files or folders...>
  npm run storm -- --example <${EXAMPLES.map((e) => e.id).join('|')}> [options]

Options:
  -o, --out <dir>        Where to write the files (default: out/storm)
  -f, --format <list>    svg, png and/or json, comma-separated (default: svg,png)
      --separate         Lay out each cloud on its own instead of as a storm
  -w, --words <n>        Words per cloud (default: ${DEFAULT_OPTIONS.maxWords})
  -d, --distinct <0-100> Favor words a document uses more than the others, in % (default: ${DEFAULT_OPTIONS.distinctiveness * 100})
      --size <0.5-1.5>   Size differences: 1 is the original scale, higher is more dramatic (default: 1)
      --vertical <0-1>   Share of vertical words (default: 0.29)
      --mark <how>       Set shared words apart: ${MARKS.join(', ')} (default: none)
  -p, --palette <name>   ${Object.keys(PALETTES).join(', ')} (default: ${DEFAULT_OPTIONS.palette})
      --font <id>        ${FONT_LIST.map((f) => f.id).join(', ')} (default: ${FONT_LIST[0].id})
      --shape <WxH>      Cloud size in pixels (default: ${DEFAULT_OPTIONS.width}x${DEFAULT_OPTIONS.height})
      --ignore <words>   Extra words to leave out, comma-separated
  -s, --seed <n>         Layout number; the same number gives the same layout (default: ${DEFAULT_OPTIONS.seed})
      --example <id>     Use a built-in example's documents and look; other options override it
  -h, --help             Show this help

Folders are read for .txt and .md files. Each file name becomes its cloud's title.`;

function fail(message: string): never {
  console.error(`Error: ${message}\nRun with --help for the options.`);
  process.exit(1);
}

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o' },
    format: { type: 'string', short: 'f' },
    separate: { type: 'boolean' },
    words: { type: 'string', short: 'w' },
    distinct: { type: 'string', short: 'd' },
    size: { type: 'string' },
    vertical: { type: 'string' },
    mark: { type: 'string' },
    palette: { type: 'string', short: 'p' },
    font: { type: 'string' },
    shape: { type: 'string' },
    ignore: { type: 'string' },
    seed: { type: 'string', short: 's' },
    example: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (args.help) {
  console.log(HELP);
  process.exit(0);
}

const number = (name: string, value: string | undefined, min: number, max: number): number | undefined => {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) fail(`--${name} must be a number from ${min} to ${max}, not "${value}".`);
  return n;
};

// ---------- Documents ----------

function readDocs(paths: string[]): Doc[] {
  const files = paths.flatMap((p) => {
    if (!existsSync(p)) fail(`No such file or folder: ${p}`);
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

const docs = example
  ? example.docs.map((name) => ({ name, text: readFileSync(join(web, '..', 'examples', example.folder, `${name}.txt`), 'utf8') }))
  : readDocs(positionals);
if (docs.length === 0) fail('Give some text files or a folder, one document per file (or --example).');

// ---------- Options ----------

const formats = (args.format ?? 'svg,png').split(',').map((f) => f.trim().toLowerCase());
for (const f of formats) if (!['svg', 'png', 'json'].includes(f)) fail(`Unknown format "${f}". Use svg, png and/or json.`);

if (args.palette && !(args.palette in PALETTES)) fail(`Unknown palette "${args.palette}". Pick one of: ${Object.keys(PALETTES).join(', ')}.`);
if (args.mark && !(MARKS as readonly string[]).includes(args.mark)) fail(`--mark must be one of: ${MARKS.join(', ')}.`);
const font: FontInfo =
  FONT_LIST.find((f) => f.id === (args.font ?? example?.look.font ?? FONT_LIST[0].id)) ??
  fail(`Unknown font "${args.font}". Pick one of: ${FONT_LIST.map((f) => f.id).join(', ')}.`);

let shape: { width: number; height: number } | undefined;
if (args.shape) {
  const m = /^(\d+)x(\d+)$/.exec(args.shape);
  if (!m) fail(`--shape must look like 640x480, not "${args.shape}".`);
  shape = { width: Number(m[1]), height: Number(m[2]) };
}

const given: Partial<StormOptions> = {
  mode: args.separate ? 'independent' : undefined,
  maxWords: number('words', args.words, 1, 500),
  distinctiveness: args.distinct === undefined ? undefined : number('distinct', args.distinct, 0, 100)! / 100,
  sizeExponent: number('size', args.size, 0.1, 3),
  verticalShare: number('vertical', args.vertical, 0, 1),
  markShared: args.mark as StormOptions['markShared'] | undefined,
  palette: args.palette as PaletteName | undefined,
  seed: number('seed', args.seed, 0, Number.MAX_SAFE_INTEGER),
  ...shape,
};
const options: Partial<StormOptions> = {
  ...example?.look.options,
  ...Object.fromEntries(Object.entries(given).filter(([, v]) => v !== undefined)),
  extraStopwords: [...(example?.look.ignore ?? []), ...(args.ignore ?? '').split(/[\s,;]+/).filter(Boolean)],
};

// ---------- Fonts ----------

const fontFile = (f: FontInfo, weight: number, subset: 'latin' | 'latin-ext') =>
  join(web, 'node_modules', '@fontsource', f.package, 'files', `${f.package}-${subset}-${weight}-normal.woff2`);
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
const storm = generateStorm(docs, options, createCanvasMeasurer((w, h) => createCanvas(w, h), font.spec));

function pngOf(cloud: Cloud, width: number, height: number, scale = 2): Buffer {
  const canvas = createCanvas(Math.round(width * scale), Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = storm.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCloud(ctx, cloud, font.spec, { scale });
  return canvas.toBuffer('image/png');
}

const out = resolve(args.out ?? join(web, 'out', 'storm'));
mkdirSync(out, { recursive: true });
const { clouds, width, height } = cropStorm(storm);
const written: string[] = [];
if (formats.includes('svg')) {
  const css = embeddedCss(font);
  cloudFileNames(storm, 'svg').forEach((name, i) => {
    writeFileSync(join(out, name), cloudToSvg(clouds[i], width, height, { font: font.spec, css, background: storm.background }));
    written.push(name);
  });
}
if (formats.includes('png')) {
  cloudFileNames(storm, 'png').forEach((name, i) => {
    writeFileSync(join(out, name), pngOf(clouds[i], width, height));
    written.push(name);
  });
}
if (formats.includes('json')) {
  writeFileSync(join(out, 'storm.json'), JSON.stringify(storm, null, 2));
  written.push('storm.json');
}

const shared = new Set(storm.clouds.flatMap((c) => c.words.filter((w) => w.cloudCount > 1).map((w) => w.text))).size;
const skipped = storm.clouds.reduce((n, c) => n + c.skipped.length, 0);
console.log(
  `${storm.clouds.length} clouds, ${shared} shared words${skipped ? `, ${skipped} words didn't fit` : ''}, ` +
    `in ${((performance.now() - started) / 1000).toFixed(1)} s`,
);
console.log(`Wrote ${written.length} files to ${out}`);
