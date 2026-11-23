import type { Doc, Storm, StormOptions } from '../core/storm.ts';
import { cloudToSvg, stormToSvg } from '../render/svg.ts';
import type { StormRequest, StormResponse } from './worker.ts';
import './style.css';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  drop: $<HTMLLabelElement>('drop'),
  files: $<HTMLInputElement>('files'),
  example: $<HTMLButtonElement>('example'),
  doclist: $<HTMLUListElement>('doclist'),
  modehint: $('modehint'),
  words: $<HTMLInputElement>('words'),
  wordsOut: $<HTMLOutputElement>('wordsOut'),
  weighting: $<HTMLSelectElement>('weighting'),
  fade: $<HTMLInputElement>('fade'),
  fadeRow: $('fadeRow'),
  stop: $<HTMLInputElement>('stop'),
  aspect: $<HTMLSelectElement>('aspect'),
  font: $<HTMLSelectElement>('font'),
  seed: $<HTMLInputElement>('seed'),
  shuffle: $<HTMLButtonElement>('shuffle'),
  status: $('status'),
  actions: $('actions'),
  focus: $('focus'),
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

let docs: Doc[] = [];
let storm: Storm | null = null;
let worker: Worker | null = null;
let rerunTimer = 0;

// ---------- Documents ----------

async function addFiles(list: FileList | File[]) {
  const files = [...list].filter((f) => /\.(txt|md|text)$/i.test(f.name) || f.type.startsWith('text/'));
  if (!files.length) {
    setStatus('Those don’t look like text files. Use .txt files, one per document.', 'error');
    return;
  }
  const added = await Promise.all(files.map(async (f) => ({ name: f.name.replace(/\.[^.]+$/, ''), text: await f.text() })));
  const names = new Set(added.map((d) => d.name));
  docs = [...docs.filter((d) => !names.has(d.name)), ...added].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  docsChanged();
}

async function loadExample() {
  const modules = import.meta.glob<string>('../../../examples/data/input/PresidentialDebate/*.txt', {
    query: '?raw',
    import: 'default',
  });
  setStatus('Loading example…');
  docs = await Promise.all(
    Object.entries(modules)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(async ([path, load]) => ({ name: path.split('/').pop()!.replace(/\.txt$/, ''), text: await load() })),
  );
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
      remove.textContent = '×';
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
  run();
}

// ---------- Options ----------

function readOptions(): Partial<StormOptions> {
  const mode = (document.querySelector('input[name=mode]:checked') as HTMLInputElement).value as StormOptions['mode'];
  const [width, height] = ui.aspect.value.split('x').map(Number);
  return {
    mode,
    maxWords: Number(ui.words.value),
    weighting: ui.weighting.value as StormOptions['weighting'],
    fadeCommonWords: ui.fade.checked,
    extraStopwords: ui.stop.value.split(/[\s,;]+/).filter(Boolean),
    width,
    height,
    seed: Number(ui.seed.value) || 0,
  };
}

function optionsChanged() {
  const mode = readOptions().mode!;
  ui.modehint.textContent = MODE_HINTS[mode];
  ui.fadeRow.hidden = mode !== 'coordinated';
  ui.wordsOut.textContent = ui.words.value;
  clearTimeout(rerunTimer);
  rerunTimer = window.setTimeout(run, 150);
}

// ---------- Running ----------

function run() {
  worker?.terminate();
  worker = null;
  if (docs.length === 0) {
    storm = null;
    render();
    setStatus('');
    return;
  }
  const request: StormRequest = { docs, options: readOptions(), fontFamily: ui.font.value };
  const started = performance.now();
  setStatus(`Building ${docs.length} cloud${docs.length === 1 ? '' : 's'}…`);
  ui.grid.setAttribute('aria-busy', 'true');
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker = w;
  w.onmessage = (e: MessageEvent<StormResponse>) => {
    if (worker !== w) return;
    const msg = e.data;
    if (msg.type === 'progress') {
      setStatus(`${msg.message}…`);
    } else if (msg.type === 'done') {
      storm = msg.storm;
      render();
      const skipped = storm.clouds.reduce((n, c) => n + c.skipped.length, 0);
      setStatus(
        `${storm.clouds.length} cloud${storm.clouds.length === 1 ? '' : 's'} in ` +
          `${((performance.now() - started) / 1000).toFixed(1)} s` +
          (skipped ? ` · ${skipped} word${skipped === 1 ? '' : 's'} didn’t fit` : '') +
          (docs.length === 1 ? ' · add more documents to compare them' : ''),
      );
      w.terminate();
      worker = null;
    } else {
      setStatus(`Something went wrong: ${msg.message}`, 'error');
      w.terminate();
      worker = null;
    }
    ui.grid.removeAttribute('aria-busy');
  };
  w.onerror = (e) => {
    setStatus(`Something went wrong: ${e.message}`, 'error');
    ui.grid.removeAttribute('aria-busy');
  };
  w.postMessage(request);
}

function setStatus(text: string, kind: 'info' | 'error' = 'info') {
  ui.status.textContent = text;
  ui.status.dataset.kind = kind;
}

// ---------- Rendering ----------

function render() {
  ui.empty.hidden = !!storm;
  ui.actions.hidden = !storm;
  ui.focus.textContent = '';
  if (!storm) {
    ui.grid.replaceChildren();
    return;
  }
  const s = storm;
  ui.grid.style.setProperty('--aspect', `${s.width} / ${s.height}`);
  ui.grid.innerHTML = s.clouds
    .map(
      (cloud) =>
        `<figure class="cloud">${cloudToSvg(cloud, s.width, s.height, { fontFamily: ui.font.value })}` +
        `<figcaption></figcaption></figure>`,
    )
    .join('');
  ui.grid.querySelectorAll('figcaption').forEach((fc, i) => (fc.textContent = s.clouds[i].name));
}

// Hovering a word highlights it in every cloud.
const highlight = document.createElement('style');
document.head.append(highlight);

function focusWord(word: string | null) {
  if (!word || !storm) {
    highlight.textContent = '';
    ui.focus.textContent = '';
    ui.grid.classList.remove('focusing');
    return;
  }
  ui.grid.classList.add('focusing');
  highlight.textContent = `.grid.focusing text[data-word="${CSS.escape(word)}"] { opacity: 1; }`;
  const n = storm.clouds.filter((c) => c.words.some((w) => w.text === word)).length;
  ui.focus.textContent = `“${word}” appears in ${n} of ${storm.clouds.length} clouds`;
}

ui.grid.addEventListener('pointerover', (e) => {
  const t = (e.target as Element).closest('text[data-word]');
  focusWord(t ? t.getAttribute('data-word') : null);
});
ui.grid.addEventListener('pointerleave', () => focusWord(null));

// ---------- Downloads ----------

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const exportSvg = () => (storm ? stormToSvg(storm, { fontFamily: ui.font.value, background: '#ffffff' }) : '');

ui.dlSvg.onclick = () => download(new Blob([exportSvg()], { type: 'image/svg+xml' }), 'wordstorm.svg');
ui.dlJson.onclick = () =>
  storm && download(new Blob([JSON.stringify(storm, null, 2)], { type: 'application/json' }), 'wordstorm.json');
ui.dlPng.onclick = async () => {
  const svg = exportSvg();
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
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
ui.drop.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
});
// Dropping anywhere on the page works too.
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
});

ui.example.onclick = loadExample;
ui.shuffle.onclick = () => {
  ui.seed.value = String(Math.floor(Math.random() * 1e6));
  optionsChanged();
};
for (const el of [ui.words, ui.weighting, ui.fade, ui.stop, ui.aspect, ui.font, ui.seed]) {
  el.addEventListener(el === ui.stop ? 'change' : 'input', optionsChanged);
}
document.querySelectorAll('input[name=mode]').forEach((r) => r.addEventListener('change', optionsChanged));

optionsChanged();
render();
if (new URLSearchParams(location.search).has('example')) loadExample();
