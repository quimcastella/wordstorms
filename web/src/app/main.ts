import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import { PALETTES, type PaletteName } from '../core/palettes.ts';
import { generateStorm, type Doc, type Storm, type StormOptions } from '../core/storm.ts';
import { createCanvasMeasurer } from '../measure/canvas.ts';
import { cloudToSvg, stormToSvg } from '../render/svg.ts';
import { absoluteFiles, embeddedFontCss, fontById, FONTS, loadFont, type CloudFont } from './fonts.ts';
import type { StormRequest, StormResponse } from './worker.ts';
import './style.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  drop: $<HTMLLabelElement>('drop'),
  files: $<HTMLInputElement>('files'),
  example: $<HTMLButtonElement>('example'),
  example2: $<HTMLButtonElement>('example2'),
  clear: $<HTMLButtonElement>('clear'),
  doclist: $<HTMLUListElement>('doclist'),
  modehint: $('modehint'),
  words: $<HTMLInputElement>('words'),
  wordsOut: $<HTMLOutputElement>('wordsOut'),
  weighting: $<HTMLSelectElement>('weighting'),
  fade: $<HTMLInputElement>('fade'),
  fadeRow: $('fadeRow'),
  fonts: $<HTMLFieldSetElement>('fonts'),
  palettes: $<HTMLFieldSetElement>('palettes'),
  stop: $<HTMLInputElement>('stop'),
  aspect: $<HTMLSelectElement>('aspect'),
  seed: $<HTMLInputElement>('seed'),
  shuffle: $<HTMLButtonElement>('shuffle'),
  title: $('title'),
  status: $('status'),
  actions: $('actions'),
  focus: $('focus'),
  unpin: $<HTMLButtonElement>('unpin'),
  grid: $('grid'),
  empty: $('empty'),
  dlSvg: $<HTMLButtonElement>('dlSvg'),
  dlPng: $<HTMLButtonElement>('dlPng'),
  dlJson: $<HTMLButtonElement>('dlJson'),
};

const MODE_HINTS = {
  coordinated: 'Shared words keep the same place, color and angle in every cloud.',
  independent: 'Each cloud is laid out on its own, like an ordinary word cloud.',
};
const FOCUS_HINT = 'Hover a word to find it in every cloud. Click to pin it.';
const EXAMPLE_TITLE = '2012 US presidential debates';

let docs: Doc[] = [];
let isExample = false;
let storm: Storm | null = null;
let stormFont: CloudFont = FONTS[0];
let worker: Worker | null = null;
let job = 0;
let rerunTimer = 0;
let pinned: string | null = null;

// ---------- Pickers ----------

function buildPickers() {
  for (const f of FONTS) {
    if (f.face) loadFont(document.fonts, f.face, f.spec.weight ?? 400, f.files).catch(() => {});
  }
  ui.fonts.append(
    ...FONTS.map((f, i) => {
      const label = document.createElement('label');
      label.className = 'font-option';
      label.innerHTML =
        `<input type="radio" name="font" value="${f.id}"${i === 0 ? ' checked' : ''} />` +
        `<span class="sample">Storm</span><span class="name"></span><span class="note"></span>`;
      const sample = label.querySelector<HTMLElement>('.sample')!;
      sample.style.fontFamily = f.spec.family;
      sample.style.fontWeight = String(f.spec.weight ?? 400);
      label.querySelector('.name')!.textContent = f.label;
      label.querySelector('.note')!.textContent = f.note;
      return label;
    }),
  );
  ui.palettes.append(
    ...(Object.entries(PALETTES) as [PaletteName, (typeof PALETTES)[PaletteName]][]).map(([id, p], i) => {
      const label = document.createElement('label');
      label.className = 'palette-option';
      const colors = p.colors.length ? p.colors.slice(0, 6) : ['#3a7bd5', '#d53a9d', '#3ad57b', '#d5a03a', '#7b3ad5', '#d5553a'];
      label.innerHTML =
        `<input type="radio" name="palette" value="${id}"${i === 0 ? ' checked' : ''} />` +
        `<span class="swatch" style="background:${p.background}">` +
        colors.map((c) => `<i style="background:${c}"></i>`).join('') +
        `</span><span class="name">${p.label}</span>`;
      return label;
    }),
  );
}

const selected = (name: string) => (document.querySelector(`input[name=${name}]:checked`) as HTMLInputElement).value;

// ---------- Documents ----------

async function addFiles(list: FileList | File[]) {
  const files = [...list].filter((f) => /\.(txt|md|text)$/i.test(f.name) || f.type.startsWith('text/'));
  if (!files.length) {
    setStatus('Those don’t look like text files. Use .txt files, one per document.', 'error');
    return;
  }
  const added = await Promise.all(files.map(async (f) => ({ name: f.name.replace(/\.[^.]+$/, ''), text: await f.text() })));
  const names = new Set(added.map((d) => d.name));
  const kept = isExample ? [] : docs.filter((d) => !names.has(d.name));
  docs = [...kept, ...added].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  isExample = false;
  docsChanged();
}

async function loadExample() {
  const modules = import.meta.glob<string>('../../../examples/data/input/PresidentialDebate/*.txt', {
    query: '?raw',
    import: 'default',
  });
  docs = await Promise.all(
    Object.entries(modules)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(async ([path, load]) => ({ name: path.split('/').pop()!.replace(/\.txt$/, ''), text: await load() })),
  );
  isExample = true;
  docsChanged();
}

function docsChanged() {
  ui.doclist.replaceChildren(
    ...docs.map((d) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = d.name;
      const size = document.createElement('small');
      size.textContent = `${(d.text.match(/\S+/g)?.length ?? 0).toLocaleString()} words`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
      remove.title = `Remove ${d.name}`;
      remove.setAttribute('aria-label', `Remove ${d.name}`);
      remove.onclick = () => {
        docs = docs.filter((x) => x !== d);
        docsChanged();
      };
      li.append(name, size, remove);
      return li;
    }),
  );
  ui.clear.hidden = docs.length < 2;
  ui.example.hidden = isExample;
  ui.title.textContent = docs.length === 0 ? 'Compare documents at a glance' : isExample ? EXAMPLE_TITLE : 'Your documents';
  run();
}

// ---------- Options ----------

function readOptions(): Partial<StormOptions> {
  const mode = selected('mode') as StormOptions['mode'];
  const [width, height] = ui.aspect.value.split('x').map(Number);
  return {
    mode,
    maxWords: Number(ui.words.value),
    weighting: ui.weighting.value as StormOptions['weighting'],
    fadeCommonWords: ui.fade.checked,
    palette: selected('palette') as PaletteName,
    extraStopwords: ui.stop.value.split(/[\s,;]+/).filter(Boolean),
    width,
    height,
    seed: Number(ui.seed.value) || 0,
  };
}

function syncControls() {
  const mode = selected('mode') as StormOptions['mode'];
  ui.modehint.textContent = MODE_HINTS[mode];
  ui.fadeRow.hidden = mode !== 'coordinated';
  ui.wordsOut.textContent = ui.words.value;
}

function optionsChanged() {
  syncControls();
  clearTimeout(rerunTimer);
  rerunTimer = window.setTimeout(run, 150);
}

// ---------- Running ----------

function run() {
  worker?.terminate();
  worker = null;
  const id = ++job;
  if (docs.length === 0) {
    storm = null;
    render();
    setStatus('');
    return;
  }
  const font = fontById(selected('font'));
  const request: StormRequest = {
    docs,
    options: readOptions(),
    font: font.spec,
    face: font.face,
    files: absoluteFiles(font),
  };
  const started = performance.now();
  setStatus(`Building ${docs.length} cloud${docs.length === 1 ? '' : 's'}…`, 'busy');
  if (!storm) renderSkeleton(docs.length);
  ui.grid.setAttribute('aria-busy', 'true');

  const finish = (s: Storm) => {
    if (id !== job) return;
    storm = s;
    stormFont = font;
    ui.grid.removeAttribute('aria-busy');
    render();
    setStatus(summary(s, performance.now() - started));
  };
  const fail = (message: string) => {
    if (id !== job) return;
    ui.grid.removeAttribute('aria-busy');
    setStatus(`Something went wrong: ${message}`, 'error');
  };

  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker = w;
  w.onmessage = (e: MessageEvent<StormResponse>) => {
    const msg = e.data;
    if (msg.type === 'progress') {
      if (id === job) setStatus(`${msg.message}…`, 'busy');
      return;
    }
    w.terminate();
    if (worker === w) worker = null;
    if (msg.type === 'done') finish(msg.storm);
    else if (msg.type === 'error') fail(msg.message);
    else runOnPage(request, font).then(finish, (err) => fail(String(err)));
  };
  w.onerror = (e) => fail(e.message);
  w.postMessage(request);
}

/** Fallback for browsers that can't draw text in a worker: lay out on the page. */
async function runOnPage(request: StormRequest, font: CloudFont): Promise<Storm> {
  if (font.face) await loadFont(document.fonts, font.face, font.spec.weight ?? 400, font.files);
  await new Promise((r) => setTimeout(r, 30));
  const measurer = createCanvasMeasurer((w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }), font.spec);
  return generateStorm(request.docs, request.options, measurer);
}

function summary(s: Storm, ms: number): string {
  const shared = new Set(s.clouds.flatMap((c) => c.words.filter((w) => w.cloudCount > 1).map((w) => w.text))).size;
  const skipped = s.clouds.reduce((n, c) => n + c.skipped.length, 0);
  const parts = [
    `${s.clouds.length} cloud${s.clouds.length === 1 ? '' : 's'}`,
    `${shared} shared word${shared === 1 ? '' : 's'}`,
    `built in ${(ms / 1000).toFixed(1)} s`,
  ];
  if (skipped) parts.push(`${skipped} word${skipped === 1 ? '' : 's'} didn’t fit`);
  if (s.clouds.length === 1) parts.push('add more documents to compare them');
  return parts.join(' · ');
}

function setStatus(text: string, kind: 'info' | 'busy' | 'error' = 'info') {
  ui.status.textContent = text;
  ui.status.dataset.kind = kind;
}

// ---------- Rendering ----------

function renderSkeleton(n: number) {
  ui.empty.hidden = true;
  ui.actions.hidden = true;
  const [w, h] = ui.aspect.value.split('x');
  ui.grid.style.setProperty('--aspect', `${w} / ${h}`);
  ui.grid.innerHTML = Array.from(
    { length: n },
    () => '<figure class="cloud skeleton"><div class="art"></div><figcaption><span></span></figcaption></figure>',
  ).join('');
}

function render() {
  ui.empty.hidden = !!storm || docs.length > 0;
  ui.actions.hidden = !storm;
  if (!storm) {
    if (docs.length === 0) ui.grid.replaceChildren();
    return;
  }
  const s = storm;
  ui.grid.style.setProperty('--aspect', `${s.width} / ${s.height}`);
  ui.grid.style.setProperty('--cloud-bg', s.background);
  ui.grid.innerHTML = s.clouds
    .map((cloud) => {
      const shared = cloud.words.filter((w) => w.cloudCount > 1).length;
      const own = cloud.words.length - shared;
      return (
        `<figure class="cloud"><div class="art">${cloudToSvg(cloud, s.width, s.height, { font: stormFont.spec })}</div>` +
        `<figcaption><span class="cname"></span><small>${shared} shared · ${own} only here</small></figcaption></figure>`
      );
    })
    .join('');
  ui.grid.querySelectorAll('.cname').forEach((el, i) => (el.textContent = s.clouds[i].name));
  focusWord(pinned && s.clouds.some((c) => c.words.some((w) => w.text === pinned)) ? pinned : null);
}

// ---------- Highlighting ----------

const highlight = document.createElement('style');
document.head.append(highlight);

function focusWord(word: string | null) {
  ui.unpin.hidden = !pinned;
  if (!word || !storm) {
    highlight.textContent = '';
    ui.grid.classList.remove('focusing');
    ui.focus.textContent = FOCUS_HINT;
    ui.focus.classList.remove('active');
    return;
  }
  ui.grid.classList.add('focusing');
  highlight.textContent = `.grid.focusing text[data-word="${CSS.escape(word)}"] { opacity: 1; }`;
  const n = storm.clouds.filter((c) => c.words.some((w) => w.text === word)).length;
  const where = n === storm.clouds.length ? 'every cloud' : n === 1 ? 'only one cloud' : `${n} of ${storm.clouds.length} clouds`;
  ui.focus.innerHTML = '';
  const chip = document.createElement('strong');
  chip.textContent = word;
  ui.focus.append(chip, ` appears in ${where}${pinned === word ? ' · pinned' : ''}`);
  ui.focus.classList.add('active');
}

const wordAt = (e: Event) => (e.target as Element).closest('text[data-word]')?.getAttribute('data-word') ?? null;

ui.grid.addEventListener('pointerover', (e) => {
  if (!pinned) focusWord(wordAt(e));
});
ui.grid.addEventListener('pointerleave', () => {
  if (!pinned) focusWord(null);
});
ui.grid.addEventListener('click', (e) => {
  const word = wordAt(e);
  pinned = word && word !== pinned ? word : null;
  focusWord(pinned ?? word);
});
ui.unpin.onclick = () => {
  pinned = null;
  focusWord(null);
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && pinned) ui.unpin.click();
});

// ---------- Downloads ----------

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function exportSvg(): Promise<string> {
  if (!storm) return '';
  return stormToSvg(storm, { font: stormFont.spec, css: await embeddedFontCss(stormFont) });
}

ui.dlSvg.onclick = async () => download(new Blob([await exportSvg()], { type: 'image/svg+xml' }), 'wordstorm.svg');
ui.dlJson.onclick = () =>
  storm && download(new Blob([JSON.stringify(storm, null, 2)], { type: 'application/json' }), 'wordstorm.json');
ui.dlPng.onclick = async () => {
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([await exportSvg()], { type: 'image/svg+xml' }));
  await img.decode();
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth * scale;
  canvas.height = img.naturalHeight * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);
  canvas.toBlob((b) => b && download(b, 'wordstorm.png'), 'image/png');
};

// ---------- Wiring ----------

ui.files.addEventListener('change', () => {
  if (ui.files.files) addFiles(ui.files.files);
  ui.files.value = '';
});
for (const type of ['dragenter', 'dragover']) {
  ui.drop.addEventListener(type, (e) => {
    e.preventDefault();
    ui.drop.classList.add('over');
  });
}
for (const type of ['dragleave', 'drop']) {
  ui.drop.addEventListener(type, () => ui.drop.classList.remove('over'));
}
// Dropping anywhere on the page works too.
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
});

ui.example.onclick = ui.example2.onclick = loadExample;
ui.clear.onclick = () => {
  docs = [];
  isExample = false;
  docsChanged();
};
ui.shuffle.onclick = () => {
  ui.seed.value = String(Math.floor(Math.random() * 1e6));
  optionsChanged();
};
for (const el of [ui.words, ui.weighting, ui.fade, ui.stop, ui.aspect, ui.seed]) {
  el.addEventListener(el === ui.stop ? 'change' : 'input', optionsChanged);
}

buildPickers();
document
  .querySelectorAll('input[name=mode], input[name=font], input[name=palette]')
  .forEach((r) => r.addEventListener('change', optionsChanged));

syncControls();
// Start with the example so the page shows what it does.
loadExample();
