// A storm as one self-contained web page: every cloud side by side, and
// hovering a word highlights it in every cloud (as on the site). The command
// line writes it as index.html next to the per-cloud files.
import type { Storm } from '../core/storm.ts';
import type { FontSpec } from '../measure/canvas.ts';
import { cloudToSvg, escapeXml } from './svg.ts';

export interface HtmlOptions {
  font?: FontSpec;
  /** CSS for the page, e.g. @font-face rules with the font embedded. */
  css?: string;
  /** Page title and heading. */
  title?: string;
}

const PAGE_CSS = `
:root{color-scheme:light dark;--bg:#f6f6f4;--text:#1f2328;--muted:#5d646d;--border:#dcdcd8;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#16181b;--text:#e8e9eb;--muted:#a3a9b1;--border:#2e3236;--card:#1f2226}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1280px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:1.4rem;margin:0 0 4px}
.status{position:sticky;top:0;z-index:1;margin:0 -16px 16px;padding:8px 16px;background:var(--bg);color:var(--muted);border-bottom:1px solid var(--border)}
.status strong{color:var(--text)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:16px}
figure{margin:0;background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.art{padding:4%}
svg{display:block;width:100%;height:auto}
svg text{cursor:pointer;transition:opacity .15s}
.focusing svg text{opacity:.1}
.focusing svg text.hit{opacity:1}
figcaption{padding:8px 14px;border-top:1px solid var(--border);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
footer{margin-top:24px;color:var(--muted);font-size:.875rem}
footer a{color:inherit}
`;

// Hover finds a word in every cloud; click pins it, and a second click or Esc clears it.
const SCRIPT = `
const grid = document.querySelector('.grid');
const status = document.querySelector('.status');
const idle = status.innerHTML;
const texts = [...grid.querySelectorAll('text[data-word]')];
const total = grid.querySelectorAll('figure').length;
let pinned = null;
function show(word) {
  grid.classList.toggle('focusing', word !== null);
  let clouds = 0;
  for (const fig of grid.querySelectorAll('figure')) {
    let found = false;
    for (const t of fig.querySelectorAll('text[data-word]')) {
      const hit = t.getAttribute('data-word') === word;
      t.classList.toggle('hit', hit);
      found ||= hit;
    }
    if (found) clouds++;
  }
  if (word === null) { status.innerHTML = idle; return; }
  status.replaceChildren();
  const b = document.createElement('strong');
  b.textContent = '\\u201c' + word + '\\u201d';
  status.append(b, ' is in ' + clouds + ' of ' + total + (total === 1 ? ' cloud' : ' clouds') +
    (pinned !== null ? '. Click it again or press Esc to clear.' : '.'));
}
const wordAt = (e) => e.target.closest('text[data-word]')?.getAttribute('data-word') ?? null;
grid.addEventListener('pointerover', (e) => { if (pinned === null) show(wordAt(e)); });
grid.addEventListener('pointerleave', () => { if (pinned === null) show(null); });
grid.addEventListener('click', (e) => {
  const word = wordAt(e);
  pinned = word === null || word === pinned ? null : word;
  show(pinned ?? word);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { pinned = null; show(null); } });
`;

/** The page for a storm (usually cropped with `cropStorm`, so the clouds fill their cards). */
export function stormToHtml(
  storm: Pick<Storm, 'clouds' | 'width' | 'height' | 'background'>,
  opts: HtmlOptions = {},
): string {
  const n = storm.clouds.length;
  const title = opts.title ?? `Word storm of ${n} ${n === 1 ? 'document' : 'documents'}`;
  const figures = storm.clouds
    .map((cloud) => {
      const svg = cloudToSvg(cloud, storm.width, storm.height, { font: opts.font, background: null, standalone: false });
      return `<figure><div class="art" style="background:${storm.background}">${svg}</div><figcaption>${escapeXml(cloud.name)}</figcaption></figure>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeXml(title)}</title>
<style>${PAGE_CSS}${(opts.css ?? '').replace(/<\//g, '<\\/')}</style>
</head>
<body>
<main>
<h1>${escapeXml(title)}</h1>
<p class="status">Hover a word to find it in every cloud. Click to pin it.</p>
<div class="grid">
${figures}
</div>
<footer>Made with <a href="https://wordstorms.org">Word Storms</a>. Words the documents share have the same place, color and angle in every cloud.</footer>
</main>
<script>${SCRIPT}</script>
</body>
</html>
`;
}
