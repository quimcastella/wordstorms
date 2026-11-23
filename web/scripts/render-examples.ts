// Renders every built-in example, in its own look, to PNGs in out/examples/,
// for checking looks and seeds. The README's image (docs/images/shakespeare.png) is copied from here.
//
//   npm run render-examples
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateStorm, type Storm } from '../src/core/storm.ts';
import { createCanvasMeasurer, fontWeight, type FontSpec } from '../src/measure/canvas.ts';
import { drawCloud } from '../src/render/canvas.ts';
import { EXAMPLES } from '../src/app/example-list.ts';
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
