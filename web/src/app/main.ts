import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { LANGUAGES, type Language } from '../core/language.ts';
import { PALETTES, type PaletteName } from '../core/palettes.ts';
import type { Storm, StormOptions, TextDoc } from '../core/storm.ts';
import { cloudFileNames, cropStorm, stormToJson } from '../render/export.ts';
import { cloudToSvg } from '../render/svg.ts';
import { setupComparison } from './compare.ts';
import { computeStorm, pageFont, type Job } from './compute.ts';
import { EXAMPLES, exampleById, loadExampleDocs, type Example, type ExampleLook } from './examples.ts';
import { embeddedFontCss, fontById, FONTS, type CloudFont } from './fonts.ts';
import './style.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  tabExamples: $<HTMLButtonElement>('tabExamples'),
  tabCreate: $<HTMLButtonElement>('tabCreate'),
  examplesPane: $('examplesPane'),
  createPane: $('createPane'),
  examples: $('examples'),
  explain: $('explain'),
  tweak: $<HTMLButtonElement>('tweak'),
  drop: $<HTMLLabelElement>('drop'),
  files: $<HTMLInputElement>('files'),
  browse: $<HTMLButtonElement>('browse'),
  startFrom: $('startFrom'),
  clear: $<HTMLButtonElement>('clear'),
  paste: $<HTMLDetailsElement>('paste'),
  pasteName: $<HTMLInputElement>('pasteName'),
  pasteText: $<HTMLTextAreaElement>('pasteText'),
  pasteAdd: $<HTMLButtonElement>('pasteAdd'),
  pasteOpen: $<HTMLButtonElement>('pasteOpen'),
  language: $<HTMLSelectElement>('language'),
  languageHint: $('languageHint'),
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
  copyCite: $<HTMLButtonElement>('copyCite'),
};

const MODE_HINTS = {
  coordinated: 'Shared words have the same place, color and angle in every cloud.',
  independent: 'Each cloud is made on its own, like a regular word cloud.',
};
/** In fourteenths, so the original's 2 in 7 is a stop. */
const VERTICAL_STEPS = 14;
const MARK_LABELS = { none: 'None', weight: 'Weight', warmth: 'Warm/cool' };
const MARK_HINTS = {
  none: 'Each word gets a random color from the palette, like in the original.',
  weight: 'Words that only one document uses are drawn thin, and shared words stay bold.',
  warmth: 'Shared words get warm colors and the rest get cool ones.',
};
const LANGUAGE_HINTS: Record<Language, string> = {
  english: 'Leaves out common English words like “the”, “and” and “said”.',
  spanish: 'Leaves out common Spanish words like “de”, “que” and “los”.',
  catalan: 'Leaves out common Catalan words, and splits l’, d’ and pronouns like -ho off the words they’re attached to.',
  none: 'Every word counts, including “the” and single letters. List words to leave out below.',
};
const FOCUS_HINT = 'Hover over a word to find it in the other clouds, or click to pin it.';
const focusHint = () => `${MODE_HINTS[selected('mode') as StormOptions['mode']]} ${FOCUS_HINT}`;
const DEFAULT_EXAMPLE = EXAMPLES[0];

type View = 'examples' | 'create';
type Controls = (string | boolean)[];

let view: View = 'examples';
/** The example shown under Explore examples. */
let example: Example = DEFAULT_EXAMPLE;
/** The documents being laid out: the example's, or yours under Make your own. */
let docs: TextDoc[] = [];
/** Your documents and settings under Make your own, kept while you look at examples. */
let createDocs: TextDoc[] = [];
let createControls: Controls | null = null;
/** The example Make your own started from (its documents and hidden ignore list), until you add your own files. */
let createFrom: Example | null = null;
let storm: Storm | null = null;
let stormFont: CloudFont = FONTS[0];
let current: Job | null = null;
let job = 0;
let rerunTimer = 0;
let pinned: string | null = null;

// ---------- Pickers ----------

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

// ---------- Views ----------

/** The settings controls under Make your own (not the file input). */
const controlEls = () =>
  [...ui.createPane.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')].filter(
    (el) => el !== ui.files && !ui.paste.contains(el),
  );
const isToggle = (el: HTMLInputElement | HTMLSelectElement): el is HTMLInputElement =>
  el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox');

function saveControls(): Controls {
  return controlEls().map((el) => (isToggle(el) ? el.checked : el.value));
}

function restoreControls(saved: Controls) {
  controlEls().forEach((el, i) => {
    if (isToggle(el)) el.checked = saved[i] as boolean;
    else el.value = saved[i] as string;
  });
  syncControls();
}

function setView(next: View) {
  if (view === 'create' && next !== 'create') {
    createDocs = docs;
    createControls = saveControls();
  }
  view = next;
  ui.tabExamples.setAttribute('aria-selected', String(next === 'examples'));
  ui.tabCreate.setAttribute('aria-selected', String(next === 'create'));
  ui.examplesPane.hidden = next !== 'examples';
  ui.createPane.hidden = next !== 'create';
  document.body.dataset.view = next;
  const url = new URL(location.href);
  url.hash = next === 'create' ? 'create' : '';
  if (next === 'examples') url.searchParams.set('example', example.id);
  else url.searchParams.delete('example');
  history.replaceState(null, '', url);
  if (next === 'examples') {
    showExample(example);
  } else {
    if (createControls) restoreControls(createControls);
    docs = createDocs;
    storm = null;
    docsChanged();
  }
}

async function showExample(ex: Example) {
  example = ex;
  ui.examples.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === ex.id)));
  if (view !== 'examples') return;
  const url = new URL(location.href);
  url.searchParams.set('example', ex.id);
  history.replaceState(null, '', url);
  applyLook(ex.look);
  explainLook(ex.look);
  storm = null;
  docs = [];
  renderSkeleton(ex.docs.length);
  showHeading();
  setStatus('Loading example…', 'busy');
  try {
    const loaded = await loadExampleDocs(ex);
    if (view !== 'examples' || example !== ex) return; // moved on meanwhile
    docs = loaded;
    docsChanged();
  } catch (err) {
    setStatus(`Couldn’t load the example: ${err instanceof Error ? err.message : String(err)}`, 'error');
  }
}

/** Opens an example under Make your own, with its documents and look, to change or download. */
async function tweakExample(ex: Example) {
  example = ex;
  const loaded = await loadExampleDocs(ex);
  applyLook(ex.look);
  createControls = saveControls();
  createDocs = loaded;
  createFrom = ex;
  view = 'examples'; // so setView doesn't save the old create state over this
  setView('create');
}

/** Sets the panel's controls to an example's look. */
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
  ui.language.value = 'english';
  ui.fade.checked = false;
  syncControls();
}

const sizeLabel = (c: number) => (c < 100 ? 'Gentle' : c === 100 ? 'Original' : 'Dramatic');
const verticalLabel = (v: number) => (v === 0 ? 'None' : v === VERTICAL_STEPS ? 'All' : `${Math.round((100 * v) / VERTICAL_STEPS)}%`);

/** Spells out an example's settings and what each one does. */
function explainLook({ font, options: o }: ExampleLook) {
  const d = Math.round(o.distinctiveness * 100);
  const f = fontById(font);
  const shape = [...ui.aspect.options].find((op) => op.value === `${o.width}x${o.height}`)?.text ?? `${o.width}×${o.height}`;
  const rows: [string, string, string][] = [
    ['Words per cloud', String(o.maxWords), 'How many words to draw from each document. Common words like “the” are left out.'],
    [
      'Favor distinctive words',
      d === 0 ? 'Off' : `${d}%`,
      d === 0
        ? 'Words are sized by how often they appear.'
        : 'Gives a boost to words a document uses more than the others do. Turn it up to see names and topics, down to see the vocabulary they share.',
    ],
    ['Shared words', MARK_LABELS[o.markShared], MARK_HINTS[o.markShared]],
    ['Colors', PALETTES[o.palette].label, 'A shared word has the same color in every cloud.'],
    ['Font', f.label, f.note + '.'],
    ['Size differences', sizeLabel(Math.round(o.sizeExponent * 100)), 'How much bigger the most frequent words get.'],
    ['Vertical words', verticalLabel(Math.round(o.verticalShare * VERTICAL_STEPS)), 'How many words are turned sideways. A few help the clouds pack tighter.'],
    ['Cloud shape', shape, ''],
    ['Layout number (seed)', String(o.seed), 'Picks one of many possible layouts. The same number always gives the same one.'],
  ];
  ui.explain.replaceChildren(
    ...rows.flatMap(([term, value, note]) => {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      const strong = document.createElement('strong');
      strong.textContent = value;
      dd.append(strong);
      if (note) {
        const span = document.createElement('span');
        span.textContent = note;
        dd.append(span);
      }
      return [dt, dd];
    }),
  );
}

function exampleCard(ex: Example): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'example-card';
  b.dataset.id = ex.id;
  b.setAttribute('aria-pressed', 'false');
  const title = document.createElement('strong');
  title.textContent = ex.title;
  const meta = document.createElement('span');
  meta.textContent = `${ex.docs.length} clouds · ${fontById(ex.look.font).label} · ${PALETTES[ex.look.options.palette].label}`;
  b.append(title, meta);
  return b;
}

function buildExampleLists() {
  ui.examples.replaceChildren(
    ...EXAMPLES.map((ex) => {
      const b = exampleCard(ex);
      b.onclick = () => showExample(ex);
      return b;
    }),
  );
  ui.startFrom.replaceChildren(
    ...EXAMPLES.map((ex) => {
      const b = exampleCard(ex);
      b.removeAttribute('aria-pressed');
      b.onclick = () => tweakExample(ex);
      return b;
    }),
  );
}

// ---------- Documents ----------

async function addFiles(list: FileList | File[]) {
  const files = [...list].filter((f) => /\.(txt|md|text)$/i.test(f.name) || f.type.startsWith('text/'));
  if (!files.length) {
    setStatus('Those don’t look like text files. Use .txt files, one per document.', 'error');
    return;
  }
  addDocs(await Promise.all(files.map(async (f) => ({ name: f.name.replace(/\.[^.]+$/, ''), text: await f.text() }))));
}

/** Adds pasted text as a document, named by the user or "Text n". */
function addPasted() {
  const text = ui.pasteText.value;
  if (!text.trim()) {
    setStatus('Paste some text first.', 'error');
    ui.pasteText.focus();
    return;
  }
  const taken = new Set((createFrom ? [] : docs).map((d) => d.name));
  let name = ui.pasteName.value.trim();
  if (!name) for (let n = taken.size + 1; !name || taken.has(name); n++) name = `Text ${n}`;
  addDocs([{ name, text }]);
  ui.pasteName.value = '';
  ui.pasteText.value = '';
  ui.pasteText.focus();
}

/** Adds documents under Make your own; ones with the name of an existing document replace it. */
function addDocs(added: TextDoc[]) {
  if (view !== 'create') {
    // Dropping files while looking at examples starts your own storm, in the example's look.
    createControls = saveControls();
    createDocs = [];
    createFrom = null;
    view = 'examples';
    setView('create');
  }
  const names = new Set(added.map((d) => d.name));
  // Your own files replace an example's documents rather than mixing with them.
  const kept = createFrom ? [] : docs.filter((d) => !names.has(d.name));
  createFrom = null;
  docs = [...kept, ...added].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  docsChanged();
}

function showHeading() {
  if (view === 'examples') {
    ui.title.textContent = example.title;
    ui.blurb.textContent = example.blurb;
    ui.findings.textContent = example.findings ?? '';
  } else {
    ui.title.textContent = docs.length === 0 ? '' : createFrom ? createFrom.title : 'Your documents';
    ui.blurb.textContent = createFrom && docs.length ? 'Change any setting you like, or drop in your own files to replace these.' : '';
    ui.findings.textContent = '';
  }
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
  showHeading();
  run();
}

// ---------- Options ----------

function readOptions(): Partial<StormOptions> {
  const mode = selected('mode') as StormOptions['mode'];
  const [width, height] = ui.aspect.value.split('x').map(Number);
  const hidden = view === 'examples' ? example.look.ignore : (createFrom?.look.ignore ?? []);
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
    extraStopwords: [...ui.stop.value.split(/[\s,;]+/).filter(Boolean), ...hidden],
    width,
    height,
    seed: Number(ui.seed.value) || 0,
    ...LANGUAGES[ui.language.value as Language],
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
      ? `${font.label} only has one weight, so this won’t change anything. Try another font.`
      : MARK_HINTS[mark];
  const d = Number(ui.distinct.value);
  ui.distinctOut.textContent = d === 0 ? 'Off' : `${d}%`;
  ui.contrastOut.textContent = sizeLabel(Number(ui.contrast.value));
  ui.verticalOut.textContent = verticalLabel(Number(ui.vertical.value));
  ui.languageHint.textContent = LANGUAGE_HINTS[ui.language.value as Language];
  if (!ui.focus.classList.contains('active')) ui.focus.textContent = focusHint();
}

function optionsChanged() {
  syncControls();
  clearTimeout(rerunTimer);
  rerunTimer = window.setTimeout(run, 150);
}

// ---------- Running ----------

function run() {
  current?.cancel();
  current = null;
  const id = ++job;
  if (docs.length === 0) {
    storm = null;
    render();
    setStatus('');
    return;
  }
  const font = fontById(selected('font'));
  const started = performance.now();
  setStatus(`Building ${docs.length} cloud${docs.length === 1 ? '' : 's'}…`, 'busy');
  if (!storm) renderSkeleton(docs.length);
  ui.grid.setAttribute('aria-busy', 'true');
  current = computeStorm(docs, readOptions(), font, (message) => {
    if (id === job) setStatus(`${message}…`, 'busy');
  });
  current.promise.then(
    (s) => {
      if (id !== job) return;
      storm = s;
      stormFont = font;
      ui.grid.removeAttribute('aria-busy');
      render();
      setStatus(summary(s, performance.now() - started));
    },
    (err) => {
      if (id !== job) return;
      ui.grid.removeAttribute('aria-busy');
      setStatus(`Something went wrong: ${err instanceof Error ? err.message : String(err)}`, 'error');
    },
  );
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
  const nothing = view === 'create' && docs.length === 0;
  ui.empty.hidden = !nothing;
  ui.toolbar.hidden = nothing;
  ui.actions.hidden = !storm || view !== 'create';
  ui.regen.hidden = false;
  document.getElementById('focusbar')!.hidden = nothing;
  if (!storm) {
    if (nothing) ui.grid.replaceChildren();
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
  highlight.textContent = `#grid.focusing text[data-word="${CSS.escape(word)}"] { opacity: 1; }`;
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

const zipName = (kind: string) => `${createFrom?.id ?? 'wordstorm'}-${kind}.zip`;

/** Each cloud as a standalone SVG in the shared, cropped frame, with its background and the font embedded. */
async function cloudSvgs(s: Storm): Promise<string[]> {
  const css = await embeddedFontCss(stormFont);
  const { clouds, width, height } = cropStorm(s);
  return clouds.map((c) => cloudToSvg(c, width, height, { font: stormFont.spec, css, background: s.background }));
}

async function svgToPng(svg: string, scale = 2): Promise<Uint8Array> {
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth * scale;
  canvas.height = img.naturalHeight * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not draw the PNG');
  return new Uint8Array(await blob.arrayBuffer());
}

async function withBusy(button: HTMLButtonElement, task: () => Promise<void>) {
  button.disabled = true;
  try {
    await task();
  } catch (err) {
    setStatus(`Download failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
  } finally {
    button.disabled = false;
  }
}

ui.dlSvg.onclick = () =>
  withBusy(ui.dlSvg, async () => {
    if (!storm) return;
    const s = storm;
    const svgs = await cloudSvgs(s);
    const names = cloudFileNames(s, 'svg');
    const files: Zippable = Object.fromEntries(svgs.map((svg, i) => [names[i], strToU8(svg)]));
    download(new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' }), zipName('svg'));
  });
ui.dlPng.onclick = () =>
  withBusy(ui.dlPng, async () => {
    if (!storm) return;
    const s = storm;
    const svgs = await cloudSvgs(s);
    const names = cloudFileNames(s, 'png');
    const pngs = await Promise.all(svgs.map((svg) => svgToPng(svg)));
    // PNGs are already compressed; store them as they are.
    const files: Zippable = Object.fromEntries(pngs.map((png, i) => [names[i], [png, { level: 0 }]]));
    download(new Blob([zipSync(files)], { type: 'application/zip' }), zipName('png'));
  });
ui.dlJson.onclick = () =>
  storm &&
  download(
    new Blob([stormToJson(storm, { font: { id: stormFont.id, ...stormFont.spec } })], { type: 'application/json' }),
    `${createFrom?.id ?? 'wordstorm'}.json`,
  );

// ---------- Wiring ----------

ui.tabExamples.onclick = () => view !== 'examples' && setView('examples');
ui.tabCreate.onclick = () => view !== 'create' && setView('create');
ui.tweak.onclick = () => tweakExample(example);
ui.browse.onclick = () => ui.files.click();
ui.pasteAdd.onclick = addPasted;
ui.pasteText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addPasted();
});
ui.pasteOpen.onclick = () => {
  ui.paste.open = true;
  ui.paste.scrollIntoView({ block: 'nearest' });
  ui.pasteText.focus();
};
window.addEventListener('hashchange', () => {
  if (location.hash === '#create' && view !== 'create') setView('create');
  else if (location.hash === '#examples' && view !== 'examples') setView('examples');
  if (location.hash === '#create' || location.hash === '#examples') document.querySelector('.intro')?.scrollIntoView();
});

ui.files.addEventListener('change', () => {
  if (ui.files.files) addFiles(ui.files.files);
  ui.files.value = '';
});
for (const target of [ui.drop, $('bigdrop')]) {
  for (const type of ['dragenter', 'dragover']) {
    target.addEventListener(type, (e) => {
      e.preventDefault();
      target.classList.add('over');
    });
  }
  for (const type of ['dragleave', 'drop']) {
    target.addEventListener(type, () => target.classList.remove('over'));
  }
}
// Dropping anywhere on the page works too.
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
});

ui.clear.onclick = () => {
  docs = [];
  createFrom = null;
  docsChanged();
};
ui.regen.onclick = () => {
  ui.seed.value = String(Math.floor(Math.random() * 1e6));
  clearTimeout(rerunTimer);
  run();
};
for (const el of [ui.words, ui.distinct, ui.contrast, ui.vertical, ui.fade, ui.stop, ui.language, ui.aspect, ui.seed]) {
  el.addEventListener(el === ui.stop ? 'change' : 'input', optionsChanged);
}
const BIBTEX = `@inproceedings{castella2014wordstorms,
  title     = {Word Storms: Multiples of Word Clouds for Visual Comparison of Documents},
  author    = {Castella, Quim and Sutton, Charles},
  booktitle = {Proceedings of the 23rd International Conference on World Wide Web (WWW)},
  year      = {2014},
  note      = {arXiv:1301.0503}
}`;

ui.copyCite.onclick = async () => {
  await navigator.clipboard.writeText(BIBTEX);
  ui.copyCite.textContent = 'Copied';
  setTimeout(() => (ui.copyCite.textContent = 'Copy BibTeX'), 1500);
};

buildPickers();
buildExampleLists();
document
  .querySelectorAll('input[name=mode], input[name=font], input[name=palette], input[name=markShared]')
  .forEach((r) => r.addEventListener('change', optionsChanged));

syncControls();
setupComparison($('cmpStorm'), $('cmpSeparate'), $('cmpStatus'));
// Start on an example (?example=<id> picks one) so the page shows what it does, or on #create.
example = exampleById(new URLSearchParams(location.search).get('example')) ?? DEFAULT_EXAMPLE;
view = 'examples';
if (location.hash === '#create') setView('create');
else setView('examples');
