// Renders every built-in example, in its own look, to PNGs in out/examples/,
// for checking looks and seeds, plus comparison.png: three fairy-tale
// collections as separate clouds above the same three in the storm. The
// README's images in docs/images/ are copied from here. Also writes the site's
// share card and icons to public/.
//
//   npm run render-examples
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateStorm, type Cloud, type Storm } from '../src/core/storm.ts';
import { createCanvasMeasurer, fontWeight, type FontSpec } from '../src/measure/canvas.ts';
import { drawCloud } from '../src/render/canvas.ts';
import { EXAMPLES, SEPARATE_LOOKS } from '../src/app/example-list.ts';
import { FONT_LIST } from '../src/app/font-list.ts';

const here = dirname(fileURLToPath(import.meta.url));
const inputRoot = join(here, '..', '..', 'examples');
const outDir = join(here, '..', 'out', 'examples');
mkdirSync(outDir, { recursive: true });

// Register every font's regular and light weights under its @font-face name.
for (const f of FONT_LIST.filter((f) => f.package)) {
  for (const weight of new Set([fontWeight(f.spec), fontWeight(f.spec, true)])) {
    const file = join(here, '..', 'node_modules', '@fontsource', f.package, 'files', `${f.package}-latin-${weight}-normal.woff2`);
    GlobalFonts.registerFromPath(file, f.face);
  }
}

function drawStorm(storm: Storm, title: string, font: FontSpec): Buffer {
  const columns = storm.clouds.length === 4 ? 2 : 3;
  const rows = Math.ceil(storm.clouds.length / columns);
  const gap = 20;
  const label = 34;
  const header = 64;
  const width = columns * storm.width + (columns + 1) * gap;
  const height = header + rows * (storm.height + label + gap) + gap;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f4f0';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#191c22';
  ctx.font = '600 28px Helvetica';
  ctx.fillText(title, gap, 42);
  storm.clouds.forEach((cloud, i) => {
    const ox = gap + (i % columns) * (storm.width + gap);
    const oy = header + Math.floor(i / columns) * (storm.height + label + gap);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = storm.background;
    ctx.fillRect(ox, oy, storm.width, storm.height);
    ctx.fillStyle = '#4b5563';
    ctx.font = '500 18px Helvetica';
    ctx.fillText(cloud.name, ox, oy + storm.height + 24);
    drawCloud(ctx, cloud, font, { x: ox, y: oy });
  });
  return canvas.toBuffer('image/png');
}

for (const ex of EXAMPLES) {
  const docs = ex.docs.map((name) => ({ name, text: readFileSync(join(inputRoot, ex.folder, `${name}.txt`), 'utf8') }));
  const font = FONT_LIST.find((f) => f.id === ex.look.font)!.spec;
  const measurer = createCanvasMeasurer((w, h) => createCanvas(w, h), font);
  const storm = generateStorm(docs, { ...ex.look.options, extraStopwords: ex.look.ignore }, measurer);
  const file = join(outDir, `${ex.id}.png`);
  writeFileSync(file, drawStorm(storm, ex.title, font));
  const shared = new Set(storm.clouds.flatMap((c) => c.words.filter((w) => w.cloudCount > 1).map((w) => w.text))).size;
  console.log(`${ex.id.padEnd(12)} ${storm.stats.millis} ms, ${shared} shared words → ${file}`);
}

/** Rows of clouds under row titles, every cloud `size` px wide and tall. */
function drawRows(rows: { title: string; clouds: Cloud[] }[], size: { width: number; height: number }, background: string, font: FontSpec): Buffer {
  const columns = Math.max(...rows.map((r) => r.clouds.length));
  const gap = 20;
  const label = 34;
  const header = 52;
  const rowHeight = header + size.height + label;
  const width = columns * size.width + (columns + 1) * gap;
  const height = rows.length * rowHeight + gap;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f4f0';
  ctx.fillRect(0, 0, width, height);
  rows.forEach((row, r) => {
    const top = r * rowHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#191c22';
    ctx.font = '600 26px Helvetica';
    ctx.fillText(row.title, gap, top + 38);
    row.clouds.forEach((cloud, i) => {
      const ox = gap + i * (size.width + gap);
      const oy = top + header;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = background;
      ctx.fillRect(ox, oy, size.width, size.height);
      ctx.fillStyle = '#4b5563';
      ctx.font = '500 18px Helvetica';
      ctx.fillText(cloud.name, ox, oy + size.height + 24);
      drawCloud(ctx, cloud, font, { x: ox, y: oy });
    });
  });
  return canvas.toBuffer('image/png');
}

// The site's comparison, cut to three collections: the same words, font and palette, laid out
// once as a storm and once as separate clouds (each its own run with its own seed, angles and
// size scale, all six documents in every run so each cloud gets the same words as in the storm).
{
  const ex = EXAMPLES.find((e) => e.id === 'fairytales')!;
  const docs = ex.docs.map((name) => ({ name, text: readFileSync(join(inputRoot, ex.folder, `${name}.txt`), 'utf8') }));
  const font = FONT_LIST.find((f) => f.id === ex.look.font)!.spec;
  const measurer = createCanvasMeasurer((w, h) => createCanvas(w, h), font);
  const base = { ...ex.look.options, extraStopwords: ex.look.ignore };
  const storm = generateStorm(docs, { ...base, mode: 'coordinated' }, measurer);
  const shown = 3;
  const separate = SEPARATE_LOOKS.slice(0, shown).map(
    (look, i) => generateStorm(docs, { ...base, mode: 'independent', markShared: 'none', ...look }, measurer).clouds[i],
  );
  const file = join(outDir, 'comparison.png');
  writeFileSync(
    file,
    drawRows(
      [
        { title: 'Separate word clouds: shared words land anywhere', clouds: separate },
        { title: 'A word storm: shared words line up', clouds: storm.clouds.slice(0, shown) },
      ],
      storm,
      storm.background,
      font,
    ),
  );
  console.log(`comparison   → ${file}`);
}

// The site's icons and share card, written straight to public/ (served at the site root).
{
  const publicDir = join(here, '..', 'public');
  mkdirSync(publicDir, { recursive: true });
  for (const weight of [400, 700]) {
    GlobalFonts.registerFromPath(join(here, '..', 'node_modules', '@fontsource', 'inter', 'files', `inter-latin-${weight}-normal.woff2`), 'Card Inter');
  }

  /** The logo: three overlapping rounded squares on a 32-unit grid. */
  const drawLogo = (ctx: SKRSContext2D, x: number, y: number, size: number) => {
    const u = size / 32;
    const squares: [number, number, number, number, string, number][] = [
      [2, 2, 17, 5, '#2a6f97', 1],
      [13, 9, 17, 5, '#d62839', 0.85],
      [6, 16, 13, 4, '#e07a1f', 0.9],
    ];
    for (const [sx, sy, side, r, color, alpha] of squares) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + sx * u, y + sy * u, side * u, side * u, r * u);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // Square icons on the site's background: iOS and Android don't keep transparency.
  for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]] as const) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f5f4f0';
    ctx.fillRect(0, 0, size, size);
    const pad = size * 0.14;
    drawLogo(ctx, pad, pad, size - 2 * pad);
    writeFileSync(join(publicDir, name), canvas.toBuffer('image/png'));
  }

  // 1200×630 share card: the name and pitch over three fairy-tale clouds from the storm.
  const ex = EXAMPLES.find((e) => e.id === 'fairytales')!;
  const docs = ex.docs.map((name) => ({ name, text: readFileSync(join(inputRoot, ex.folder, `${name}.txt`), 'utf8') }));
  const font = FONT_LIST.find((f) => f.id === ex.look.font)!.spec;
  const measurer = createCanvasMeasurer((w, h) => createCanvas(w, h), font);
  const storm = generateStorm(docs, { ...ex.look.options, extraStopwords: ex.look.ignore }, measurer);
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f4f0';
  ctx.fillRect(0, 0, width, height);
  drawLogo(ctx, 48, 40, 64);
  ctx.fillStyle = '#191c22';
  ctx.font = '700 50px "Card Inter"';
  ctx.fillText('Word Storms', 132, 88);
  ctx.fillStyle = '#4b5563';
  ctx.font = '400 28px "Card Inter"';
  ctx.fillText('Word clouds that line up, so you can compare documents', 48, 152);
  ctx.textAlign = 'right';
  ctx.font = '700 26px "Card Inter"';
  ctx.fillStyle = '#2f4ccf';
  ctx.fillText('wordstorms.org', width - 48, 84);
  ctx.textAlign = 'left';
  const shown = [0, 2, 3]; // Grimm, Perrault and Aesop: two alike, one that stands apart
  const gap = 24;
  const side = (width - 2 * 48 - (shown.length - 1) * gap) / shown.length;
  const scale = side / storm.width;
  const top = 184;
  shown.forEach((index, i) => {
    const cloud = storm.clouds[index];
    const ox = 48 + i * (side + gap);
    ctx.fillStyle = storm.background;
    ctx.beginPath();
    ctx.roundRect(ox, top, side, storm.height * scale, 12);
    ctx.fill();
    drawCloud(ctx, cloud, font, { x: ox, y: top, scale });
    ctx.fillStyle = '#4b5563';
    ctx.font = '400 20px "Card Inter"';
    ctx.fillText(cloud.name, ox + 4, top + storm.height * scale + 28);
  });
  writeFileSync(join(publicDir, 'social-card.png'), canvas.toBuffer('image/png'));
  console.log(`icons, card   → ${publicDir}`);
}
