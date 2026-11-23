// Runs the port on the example data and compares it with the Java reference
// layouts in ../reference. Writes SVGs to out/ for eyeballing.
//
//   npm run compare
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutMetrics, vocabularyAgreement, type Layout } from '../src/core/metrics.ts';
import { generateStorm, type Mode, type Storm } from '../src/core/storm.ts';
import { createCanvasMeasurer } from '../src/measure/canvas.ts';
import { stormToSvg } from '../src/render/svg.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const inputDir = join(root, 'examples', 'data', 'input', 'PresidentialDebate');
const outDir = join(here, '..', 'out');
mkdirSync(outDir, { recursive: true });

const docs = readdirSync(inputDir)
  .filter((f) => f.endsWith('.txt'))
  .sort()
  .map((f) => ({ name: f.replace(/\.txt$/, ''), text: readFileSync(join(inputDir, f), 'utf8') }));

// The web app's default font, so the numbers reflect what users see.
GlobalFonts.registerFromPath(
  join(here, '..', 'node_modules', '@fontsource', 'oswald', 'files', 'oswald-latin-600-normal.woff2'),
  'Oswald',
);
const font = { family: 'Oswald', weight: 600 };
const measurer = createCanvasMeasurer((w, h) => createCanvas(w, h), font);

interface RefWord {
  text: string;
  x: number;
  y: number;
  bounds: [number, number, number, number];
  placed: boolean;
}
interface Ref {
  width: number;
  height: number;
  clouds: { name: string; words: RefWord[] }[];
}

const SEEDS = [123456, 1, 2, 3, 4];
const fmt = (n: number, d = 2) => n.toFixed(d).padStart(8);

for (const mode of ['independent', 'coordinated'] as Mode[]) {
  const ref = JSON.parse(readFileSync(join(root, 'reference', `presidential-debate-${mode}.json`), 'utf8')) as Ref;
  const refLayout: Layout = {
    width: ref.width,
    height: ref.height,
    clouds: ref.clouds.map((c) => ({
      name: c.name,
      words: c.words
        .filter((w) => w.placed)
        .map((w) => ({ text: w.text, x: w.x, y: w.y, width: w.bounds[2] - 1, height: w.bounds[3] - 1 })),
    })),
  };

  // One seed is noisy, so average the port over several.
  const storms = SEEDS.map((seed) => generateStorm(docs, { mode, seed }, measurer));
  const storm = storms[0];
  writeFileSync(join(outDir, `${mode}.svg`), stormToSvg(storm, { font }));
  writeFileSync(join(outDir, `${mode}.json`), JSON.stringify(storm, null, 1));

  const a = layoutMetrics(refLayout);
  const ms = storms.map(layoutMetrics);
  const avg = (f: (m: (typeof ms)[number]) => number) => ms.reduce((s, m) => s + f(m), 0) / ms.length;
  const ink = storms.reduce((s, st) => s + inkOverlapShare(st), 0) / storms.length;
  const millis = storms.reduce((s, st) => s + st.stats.millis, 0) / storms.length;
  console.log(`\n${mode}  (port: mean of ${SEEDS.length} seeds, ${millis.toFixed(0)} ms each)`);
  console.log(`  vocabulary agreement with Java: ${(vocabularyAgreement(refLayout, storm) * 100).toFixed(1)}%`);
  console.log('                       Java      port');
  console.log(`  coordination px  ${fmt(a.coordinationPx)}  ${fmt(avg((m) => m.coordinationPx))}   (lower = more coordinated)`);
  console.log(`  overlaps/cloud   ${fmt(a.overlapsPerCloud)}  ${fmt(avg((m) => m.overlapsPerCloud))}   (word boxes)`);
  console.log(`  overlap share    ${fmt(a.overlapShare * 100)}% ${fmt(avg((m) => m.overlapShare) * 100)}%   (word boxes)`);
  console.log(`  ink overlap               ${fmt(ink * 100, 3)}%   (ink pixels drawn twice)`);
  console.log(`  fill             ${fmt(a.fill * 100)}% ${fmt(avg((m) => m.fill) * 100)}%   (word area / frame)`);
  const skipped = storms.reduce((s, st) => s + st.clouds.reduce((n, c) => n + c.skipped.length, 0), 0);
  if (skipped) console.log(`  skipped words: ${(skipped / storms.length).toFixed(1)} per storm`);
}

/** Share of inked pixels that more than one word draws on. */
function inkOverlapShare(storm: Storm): number {
  const canvas = createCanvas(storm.width, storm.height);
  const ctx = canvas.getContext('2d');
  let inked = 0;
  let doubled = 0;
  for (const cloud of storm.clouds) {
    const hits = new Uint8Array(storm.width * storm.height);
    for (const w of cloud.words) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, storm.width, storm.height);
      ctx.translate(w.x + w.originX, w.y + w.originY);
      ctx.rotate((w.angle * Math.PI) / 180);
      ctx.font = `${font.weight} ${w.fontSize}px ${font.family}`;
      ctx.fillText(w.text, 0, 0);
      const { data } = ctx.getImageData(0, 0, storm.width, storm.height);
      for (let i = 0; i < hits.length; i++) {
        if (data[i * 4 + 3] <= 128) continue;
        if (hits[i] === 0) inked++;
        else if (hits[i] === 1) doubled++;
        hits[i]++;
      }
    }
  }
  return inked ? doubled / inked : 0;
}
console.log(`\nSVGs written to ${outDir}`);
