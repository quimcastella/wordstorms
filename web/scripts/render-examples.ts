// Renders every built-in example with the app's defaults to PNGs in out/examples/,
// for comparing corpora and for README images.
//
//   npm run render-examples
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateStorm, type Storm } from '../src/core/storm.ts';
import { createCanvasMeasurer, cssFont } from '../src/measure/canvas.ts';
import { EXAMPLES } from '../src/app/example-list.ts';

const here = dirname(fileURLToPath(import.meta.url));
const inputRoot = join(here, '..', '..', 'examples', 'data', 'input');
const outDir = join(here, '..', 'out', 'examples');
mkdirSync(outDir, { recursive: true });

for (const weight of [600, 300]) {
  GlobalFonts.registerFromPath(
    join(here, '..', 'node_modules', '@fontsource', 'oswald', 'files', `oswald-latin-${weight}-normal.woff2`),
    'Oswald',
  );
}
const font = { family: 'Oswald', weight: 600, lightWeight: 300 };

function drawStorm(storm: Storm, title: string): Buffer {
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
    for (const w of cloud.words) {
      ctx.setTransform(1, 0, 0, 1, ox + w.x + w.originX, oy + w.y + w.originY);
      ctx.rotate((w.angle * Math.PI) / 180);
      ctx.font = cssFont(font, w.fontSize, w.light);
      ctx.fillStyle = w.color;
      ctx.globalAlpha = w.opacity;
      ctx.fillText(w.text, 0, 0);
      ctx.globalAlpha = 1;
    }
  });
  return canvas.toBuffer('image/png');
}

for (const ex of EXAMPLES) {
  const docs = ex.docs.map((name) => ({ name, text: readFileSync(join(inputRoot, ex.folder, `${name}.txt`), 'utf8') }));
  const measurer = createCanvasMeasurer((w, h) => createCanvas(w, h), font);
  const storm = generateStorm(docs, {}, measurer);
  const file = join(outDir, `${ex.id}.png`);
  writeFileSync(file, drawStorm(storm, ex.title));
  const shared = new Set(storm.clouds.flatMap((c) => c.words.filter((w) => w.cloudCount > 1).map((w) => w.text))).size;
  console.log(`${ex.id.padEnd(12)} ${storm.stats.millis} ms, ${shared} shared words → ${file}`);
}
