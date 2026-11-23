// Runs the port on the example data and compares it with the Java reference
// layouts in ../reference. Writes SVGs to out/ for eyeballing.
//
//   npm run compare
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutMetrics, vocabularyAgreement, type Layout } from '../src/core/metrics.ts';
import { generateStorm, type Mode } from '../src/core/storm.ts';
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

const fontFamily = 'Helvetica';
const measurer = createCanvasMeasurer((w, h) => createCanvas(w, h), fontFamily);

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

  const storm = generateStorm(docs, { mode }, measurer);
  writeFileSync(join(outDir, `${mode}.svg`), stormToSvg(storm, { fontFamily, background: '#fff' }));
  writeFileSync(join(outDir, `${mode}.json`), JSON.stringify(storm, null, 1));

  const a = layoutMetrics(refLayout);
  const b = layoutMetrics(storm);
  console.log(`\n${mode}  (${storm.stats.millis} ms, ${storm.stats.passes} passes, ` +
    `${storm.stats.forceIterations} force steps, shrink ${storm.stats.shrink.toFixed(3)})`);
  console.log(`  vocabulary agreement with Java: ${(vocabularyAgreement(refLayout, storm) * 100).toFixed(1)}%`);
  console.log('                       Java      port');
  console.log(`  coordination px  ${fmt(a.coordinationPx)}  ${fmt(b.coordinationPx)}   (lower = more coordinated)`);
  console.log(`  overlaps/cloud   ${fmt(a.overlapsPerCloud)}  ${fmt(b.overlapsPerCloud)}`);
  console.log(`  overlap share    ${fmt(a.overlapShare * 100)}% ${fmt(b.overlapShare * 100)}%`);
  console.log(`  fill             ${fmt(a.fill * 100)}% ${fmt(b.fill * 100)}%   (word area / frame)`);
  const skipped = storm.clouds.reduce((s, c) => s + c.skipped.length, 0);
  if (skipped) console.log(`  skipped words: ${skipped}`);
}
console.log(`\nSVGs written to ${outDir}`);
