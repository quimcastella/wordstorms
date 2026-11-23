// The "Why a storm" section: the fairy tales as a word storm next to six
// separate clouds in the same font and palette, each laid out on its own the
// way ordinary word-cloud tools would. Laid out once the section is near the
// screen.
import type { Cloud, StormOptions } from '../core/storm.ts';
import { cloudToSvg } from '../render/svg.ts';
import { computeStorm } from './compute.ts';
import { exampleById, loadExampleDocs } from './examples.ts';
import { fontById, type CloudFont } from './fonts.ts';

/**
 * Per separate cloud: its own seed, share of vertical words and size scale. An ordinary cloud
 * always puts its biggest word near the middle, so with one setting for all, "little" sat in
 * the same spot in Grimm, Andersen and Perrault. These were searched so shared words land in
 * different places and turn differently than in the storm and in each other.
 */
const SEPARATE: Pick<StormOptions, 'seed' | 'verticalShare' | 'sizeExponent'>[] = [
  { seed: 191056, verticalShare: 1 / 2, sizeExponent: 1.2 },
  { seed: 485841, verticalShare: 3 / 7, sizeExponent: 0.9 },
  { seed: 646003, verticalShare: 1 / 7, sizeExponent: 1.3 },
  { seed: 671542, verticalShare: 5 / 14, sizeExponent: 1 },
  { seed: 784190, verticalShare: 1 / 2, sizeExponent: 1.1 },
  { seed: 675106, verticalShare: 2 / 7, sizeExponent: 0.8 },
];

interface Drawn {
  cloud: Cloud;
  width: number;
  height: number;
  background: string;
  font: CloudFont;
}

function draw(grid: HTMLElement, clouds: Drawn[]) {
  grid.style.setProperty('--cols', '3');
  grid.style.setProperty('--aspect', `${clouds[0].width} / ${clouds[0].height}`);
  grid.replaceChildren(
    ...clouds.map((d) => {
      const fig = document.createElement('figure');
      fig.className = 'cloud';
      fig.style.setProperty('--cloud-bg', d.background);
      fig.innerHTML = `<div class="art">${cloudToSvg(d.cloud, d.width, d.height, { font: d.font.spec })}</div><figcaption><span class="cname"></span></figcaption>`;
      fig.querySelector('.cname')!.textContent = d.cloud.name;
      return fig;
    }),
  );
}

/** Hovering a word highlights it in every cloud of both grids. */
function linkHover(grids: HTMLElement[], status: HTMLElement) {
  const style = document.createElement('style');
  document.head.append(style);
  const idle = status.textContent;
  const focus = (word: string | null) => {
    grids.forEach((g) => g.classList.toggle('focusing', !!word));
    style.textContent = word ? grids.map((g) => `#${g.id}.focusing text[data-word="${CSS.escape(word)}"]`).join(',') + '{opacity:1}' : '';
    status.textContent = word ? `“${word}” is highlighted in both sets of clouds.` : idle;
  };
  for (const g of grids) {
    g.addEventListener('pointerover', (e) => focus((e.target as Element).closest('text[data-word]')?.getAttribute('data-word') ?? null));
    g.addEventListener('pointerleave', () => focus(null));
  }
}

async function build(stormGrid: HTMLElement, separateGrid: HTMLElement, status: HTMLElement) {
  const ex = exampleById('fairytales');
  if (!ex) return;
  const docs = await loadExampleDocs(ex);
  const base: Partial<StormOptions> = { ...ex.look.options, extraStopwords: ex.look.ignore };
  const stormFont = fontById(ex.look.font);
  const storm = await computeStorm(docs, { ...base, mode: 'coordinated' }, stormFont).promise;
  draw(
    stormGrid,
    storm.clouds.map((cloud) => ({ cloud, width: storm.width, height: storm.height, background: storm.background, font: stormFont })),
  );
  // Same words, font and palette, but no coordination: each cloud is its own independent run with its own
  // seed, angles and size scale. All six documents go in every run so each cloud gets the same words as in the storm.
  const separate: Drawn[] = [];
  for (const [i, look] of SEPARATE.entries()) {
    const s = await computeStorm(docs, { ...base, mode: 'independent', markShared: 'none', ...look }, stormFont).promise;
    separate.push({ cloud: s.clouds[i], width: s.width, height: s.height, background: s.background, font: stormFont });
  }
  draw(separateGrid, separate);
  linkHover([stormGrid, separateGrid], status);
}

export function setupComparison(stormGrid: HTMLElement, separateGrid: HTMLElement, status: HTMLElement) {
  const skeleton = '<figure class="cloud skeleton"><div class="art"></div><figcaption><span></span></figcaption></figure>'.repeat(6);
  for (const g of [stormGrid, separateGrid]) {
    g.style.setProperty('--cols', '3');
    g.style.setProperty('--aspect', '1 / 1');
    g.innerHTML = skeleton;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      build(stormGrid, separateGrid, status).catch((err) => {
        status.textContent = `Couldn’t draw the comparison: ${err instanceof Error ? err.message : String(err)}`;
      });
    },
    { rootMargin: '400px' },
  );
  observer.observe(stormGrid);
}
