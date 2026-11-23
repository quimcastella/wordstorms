import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import { PALETTES, type PaletteName } from '../core/palettes.ts';
import { generateStorm, type Doc, type Storm, type StormOptions } from '../core/storm.ts';
import { createCanvasMeasurer } from '../measure/canvas.ts';
import { cloudToSvg, stormToSvg } from '../render/svg.ts';
import { EXAMPLES, exampleById, loadExampleDocs, type Example, type ExampleLook } from './examples.ts';
import { absoluteFaces, embeddedFontCss, fontById, FONTS, loadFont, type CloudFont } from './fonts.ts';
import type { StormRequest, StormResponse } from './worker.ts';
import './style.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  drop: $<HTMLLabelElement>('drop'),
  files: $<HTMLInputElement>('files'),
  examples: $('examples'),
  example2: $<HTMLButtonElement>('example2'),
  clear: $<HTMLButtonElement>('clear'),
  doclist: $<HTMLUListElement>('doclist'),
  words: $<HTMLInputElement>('words'),
  wordsOut: $<HTMLOutputElement>('wordsOut'),
  distinct: $<HTMLInputElement>('distinct'),
  distinctOut: $<HTMLOutputElement>('distinctOut'),
  contrast: $<HTMLInputElement>('contrast'),
  contrastOut: $<HTMLOutputElement>('contrastOut'),
  markhint: $('markhint'),
  vertical: $<HTMLInputElement>('vertical'),
  verticalOut: $<HTMLOutputElement>('verticalOut'),
  fade: $<HTMLInputElement>('fade'),
  fadeRow: $('fadeRow'),
  fonts: $<HTMLFieldSetElement>('fonts'),
  palettes: $<HTMLFieldSetElement>('palettes'),
  stop: $<HTMLInputElement>('stop'),
  aspect: $<HTMLSelectElement>('aspect'),
  seed: $<HTMLInputElement>('seed'),
  regen: $<HTMLButtonElement>('regen'),
  toolbar: $('toolbar'),
  title: $('title'),
  blurb: $('blurb'),
  findings: $('findings'),
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
/** In fourteenths, so the original's 2 in 7 is a stop. */
const VERTICAL_STEPS = 14;
const MARK_HINTS = {
  none: 'Every word gets a random color from the palette, as in the original.',
  weight: 'Words only one document uses are drawn thin; shared words stay bold.',
  warmth: 'Shared words get warm colors; words only one document uses get cool ones.',
};
const FOCUS_HINT = 'Hover a word to find it in every cloud; click to pin it.';
const focusHint = () => `${MODE_HINTS[selected('mode') as StormOptions['mode']]} ${FOCUS_HINT}`;
const DEFAULT_EXAMPLE = EXAMPLES[0];

let docs: Doc[] = [];
let example: Example | null = null;
let storm: Storm | null = null;
let stormFont: CloudFont = FONTS[0];
let worker: Worker | null = null;
let job = 0;
let rerunTimer = 0;
let pinned: string | null = null;

// ---------- Pickers ----------

const pageFaces = new Map<string, Promise<void>>();

/** Loads a font's regular (or light) weight on the page, once. */
function pageFont(font: CloudFont, light: boolean): Promise<void> {
  const key = `${font.id}|${light}`;
  let loaded = pageFaces.get(key);
  if (!loaded) {
    loaded = loadFont(document.fonts, light ? { ...font, files: [] } : { ...font, lightFiles: [] });
    pageFaces.set(key, loaded);
  }
  return loaded;
}

function buildPickers() {
  for (const f of FONTS) {
    pageFont(f, false).catch(() => {});
  }
  ui.fonts.append(
    ...FONTS.map((f, i) => {
      const label = document.createElement('label');
      label.className = 'font-option';
      label.innerHTML =
        `<input type="radio" name="font" value="${f.id}"${i === 0 ? ' checked' : ''} />` +
        `<span class="sample">Storm</span><span class="name"></span>`;
      label.title = f.note;
      const sample = label.querySelector<HTMLElement>('.sample')!;
      sample.style.fontFamily = f.spec.family;
      sample.style.fontWeight = String(f.spec.weight ?? 400);
      label.querySelector('.name')!.textContent = f.label;
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
  // Your own files replace an example rather than mixing with it.
  const kept = example ? [] : docs.filter((d) => !names.has(d.name));
  docs = [...kept, ...added].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  setExample(null);
  docsChanged();
}

async function loadExample(ex: Example) {
  setExample(ex);
  applyLook(ex.look);
  storm = null;
  renderSkeleton(ex.docs.length);
  setStatus('Loading example…', 'busy');
  try {
    const loaded = await loadExampleDocs(ex);
    if (example !== ex) return; // another example was picked meanwhile
    docs = loaded;
    docsChanged();
  } catch (err) {
    setStatus(`Couldn’t load the example: ${err instanceof Error ? err.message : String(err)}`, 'error');
  }
}

/** Sets the panel's controls to an example's look; everything stays editable. */
function applyLook({ font, options: o }: ExampleLook) {
  const check = (name: string, value: string) => {
    const input = document.querySelector<HTMLInputElement>(`input[name=${name}][value="${value}"]`);
    if (input) input.checked = true;
  };
  check('font', font);
  check('palette', o.palette);
  check('markShared', o.markShared);
  ui.words.value = String(o.maxWords);
  ui.distinct.value = String(Math.round(o.distinctiveness * 100));
  ui.contrast.value = String(Math.round(o.sizeExponent * 100));
  ui.vertical.value = String(Math.round(o.verticalShare * VERTICAL_STEPS));
  ui.aspect.value = `${o.width}x${o.height}`;
  ui.seed.value = String(o.seed);
  ui.stop.value = '';
  syncControls();
}

function setExample(ex: Example | null) {
  example = ex;
  ui.examples.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === ex?.id)));
  const url = new URL(location.href);
  if (ex) url.searchParams.set('example', ex.id);
  else url.searchParams.delete('example');
  history.replaceState(null, '', url);
}

function buildExampleChips() {
  ui.examples.replaceChildren(
    ...EXAMPLES.map((ex) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.id = ex.id;
      b.textContent = ex.title;
      b.title = ex.blurb;
      b.setAttribute('aria-pressed', 'false');
      b.onclick = () => loadExample(ex);
      return b;
    }),
  );
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
  ui.title.textContent = docs.length === 0 ? 'Compare documents at a glance' : example ? example.title : 'Your documents';
  ui.blurb.textContent = docs.length && example ? example.blurb : '';
  ui.findings.textContent = docs.length && example?.findings ? example.findings : '';
  run();
}

// ---------- Options ----------

function readOptions(): Partial<StormOptions> {
  const mode = selected('mode') as StormOptions['mode'];
  const [width, height] = ui.aspect.value.split('x').map(Number);
  return {
    mode,
    maxWords: Number(ui.words.value),
    distinctiveness: Number(ui.distinct.value) / 100,
    sizeExponent: Number(ui.contrast.value) / 100,
    verticalShare: Number(ui.vertical.value) / VERTICAL_STEPS,
    markShared: selected('markShared') as StormOptions['markShared'],
    fadeCommonWords: ui.fade.checked,
    palette: selected('palette') as PaletteName,
    // An example's own ignore list applies too, without filling the field.
    extraStopwords: [...ui.stop.value.split(/[\s,;]+/).filter(Boolean), ...(example?.look.ignore ?? [])],
    width,
    height,
    seed: Number(ui.seed.value) || 0,
  };
}

function syncControls() {
  const mode = selected('mode') as StormOptions['mode'];
  ui.fadeRow.hidden = mode !== 'coordinated';
  ui.wordsOut.textContent = ui.words.value;
  const mark = selected('markShared') as StormOptions['markShared'];
  const font = fontById(selected('font'));
  ui.markhint.textContent =
    mark === 'weight' && !font.spec.lightWeight
      ? `${font.label} has only one weight, so this marks nothing. Pick another font to see it.`
      : MARK_HINTS[mark];
  const d = Number(ui.distinct.value);
  ui.distinctOut.textContent = d === 0 ? 'Off' : `${d}%`;
  const c = Number(ui.contrast.value);
  ui.contrastOut.textContent = c < 100 ? 'Gentle' : c === 100 ? 'Original' : 'Dramatic';
  const v = Number(ui.vertical.value);
  ui.verticalOut.textContent = v === 0 ? 'None' : v === VERTICAL_STEPS ? 'All' : `${Math.round((100 * v) / VERTICAL_STEPS)}%`;
  if (!ui.focus.classList.contains('active')) ui.focus.textContent = focusHint();
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
    font: absoluteFaces(font),
  };
  const started = performance.now();
  setStatus(`Building ${docs.length} cloud${docs.length === 1 ? '' : 's'}…`, 'busy');
  if (!storm) renderSkeleton(docs.length);
  ui.grid.setAttribute('aria-busy', 'true');

  const finish = async (s: Storm) => {
    // The worker loaded the font for itself; the page needs it too, to draw.
    await Promise.all([pageFont(font, false), pageFont(font, true)]).catch(() => {});
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
  await Promise.all([pageFont(font, false), pageFont(font, true)]);
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

/** Most clouds per row: four make a 2×2 square, otherwise up to three. The CSS drops columns on narrow screens. */
function setColumns(n: number) {
  ui.grid.style.setProperty('--cols', String(n === 4 ? 2 : Math.max(1, Math.min(n, 3))));
}

function renderSkeleton(n: number) {
  ui.empty.hidden = true;
  ui.toolbar.hidden = false;
  ui.actions.hidden = true;
  const [w, h] = ui.aspect.value.split('x');
  ui.grid.style.setProperty('--aspect', `${w} / ${h}`);
  setColumns(n);
  ui.grid.innerHTML = Array.from(
    { length: n },
    () => '<figure class="cloud skeleton"><div class="art"></div><figcaption><span></span></figcaption></figure>',
  ).join('');
}

function render() {
  ui.empty.hidden = !!storm || docs.length > 0;
  ui.toolbar.hidden = docs.length === 0;
  ui.actions.hidden = !storm;
  if (!storm) {
    if (docs.length === 0) ui.grid.replaceChildren();
    return;
  }
  const s = storm;
  ui.grid.style.setProperty('--aspect', `${s.width} / ${s.height}`);
  ui.grid.style.setProperty('--cloud-bg', s.background);
  setColumns(s.clouds.length);
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
    ui.focus.textContent = focusHint();
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
  // R for a new layout, unless typing somewhere.
  const typing = (e.target as Element).closest('input:not([type=range]):not([type=radio]):not([type=checkbox]), select, textarea');
  if (e.key.toLowerCase() === 'r' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && !ui.toolbar.hidden) ui.regen.click();
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

ui.example2.onclick = () => loadExample(DEFAULT_EXAMPLE);
ui.clear.onclick = () => {
  docs = [];
  setExample(null);
  docsChanged();
};
ui.regen.onclick = () => {
  ui.seed.value = String(Math.floor(Math.random() * 1e6));
  clearTimeout(rerunTimer);
  run();
};
for (const el of [ui.words, ui.distinct, ui.contrast, ui.vertical, ui.fade, ui.stop, ui.aspect, ui.seed]) {
  el.addEventListener(el === ui.stop ? 'change' : 'input', optionsChanged);
}

buildPickers();
buildExampleChips();
document
  .querySelectorAll('input[name=mode], input[name=font], input[name=palette], input[name=markShared]')
  .forEach((r) => r.addEventListener('change', optionsChanged));

syncControls();
// Start with an example (?example=<id> picks one) so the page shows what it does.
loadExample(exampleById(new URLSearchParams(location.search).get('example')) ?? DEFAULT_EXAMPLE);
