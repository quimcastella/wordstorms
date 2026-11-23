import type { Cloud, PlacedWord, Storm } from '../core/storm.ts';
import { DEFAULT_FONT, fontWeight, type FontSpec } from '../measure/canvas.ts';

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

const num = (n: number) => String(Math.round(n * 100) / 100);

/** One word; `font` sets the weight of light words. */
export function wordToSvg(w: PlacedWord, font?: FontSpec): string {
  const tx = num(w.x + w.originX);
  const ty = num(w.y + w.originY);
  const rotate = w.angle === 0 ? '' : ` rotate(${w.angle})`;
  const opacity = w.opacity < 1 ? ` fill-opacity="${num(w.opacity)}"` : '';
  const weight = w.light && font?.lightWeight ? ` font-weight="${font.lightWeight}"` : '';
  return (
    `<text transform="translate(${tx} ${ty})${rotate}" font-size="${num(w.fontSize)}"${weight} ` +
    `fill="${w.color}"${opacity} data-word="${escapeXml(w.text)}">${escapeXml(w.text)}</text>`
  );
}

export interface SvgOptions {
  font?: FontSpec;
  /** Background fill; `null` for transparent. Defaults to the storm's background. */
  background?: string | null;
  /** Adds xmlns so the SVG can be saved as a standalone file. */
  standalone?: boolean;
  /** CSS (e.g. @font-face rules with embedded fonts) to include in the file. */
  css?: string;
}

const fontAttrs = (font: FontSpec = { family: DEFAULT_FONT }) =>
  `font-family="${escapeXml(font.family)}" font-weight="${fontWeight(font)}"`;

const style = (css?: string) => (css ? `<style>${css.replace(/<\//g, '<\\/')}</style>` : '');

/**
 * The clouds cut down to the box around every cloud's words, plus a small margin. All files share this frame,
 * so shared words still line up when you stack them, without the empty space left around the storm.
 */
export function cropStorm(s: Storm): { clouds: Cloud[]; width: number; height: number } {
  const words = s.clouds.flatMap((c) => c.words);
  if (!words.length) return { clouds: s.clouds, width: s.width, height: s.height };
  const x0 = Math.min(...words.map((w) => w.x));
  const y0 = Math.min(...words.map((w) => w.y));
  const x1 = Math.max(...words.map((w) => w.x + w.width));
  const y1 = Math.max(...words.map((w) => w.y + w.height));
  const pad = Math.round(0.02 * Math.max(x1 - x0, y1 - y0));
  const dx = pad - x0;
  const dy = pad - y0;
  return {
    clouds: s.clouds.map((c) => ({ ...c, words: c.words.map((w) => ({ ...w, x: w.x + dx, y: w.y + dy })) })),
    width: Math.ceil(x1 - x0 + 2 * pad),
    height: Math.ceil(y1 - y0 + 2 * pad),
  };
}

/** One cloud as an SVG document. */
export function cloudToSvg(cloud: Cloud, width: number, height: number, opts: SvgOptions = {}): string {
  const xmlns = opts.standalone === false ? '' : ' xmlns="http://www.w3.org/2000/svg"';
  const bg = opts.background ? `<rect width="100%" height="100%" fill="${opts.background}"/>` : '';
  return (
    `<svg${xmlns} viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ` +
    `${fontAttrs(opts.font)} role="img" aria-label="${escapeXml(cloud.name)}">` +
    `<title>${escapeXml(cloud.name)}</title>${style(opts.css)}${bg}` +
    cloud.words.map((w) => wordToSvg(w, opts.font)).join('') +
    `</svg>`
  );
}

/** The whole storm as a single SVG: a grid of clouds with their names underneath. */
export function stormToSvg(storm: Storm, opts: SvgOptions & { columns?: number } = {}): string {
  const n = storm.clouds.length;
  const columns = opts.columns ?? Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / columns);
  const background = opts.background === undefined ? storm.background : opts.background;
  const label = 32;
  const gap = 24;
  const margin = 24;
  const cellW = storm.width + gap;
  const cellH = storm.height + label + gap;
  const dark = background ? luminance(background) < 0.4 : false;
  const labelColor = dark ? '#cbd5e1' : '#4b5563';
  const parts = storm.clouds.map((cloud, i) => {
    const x = margin + (i % columns) * cellW;
    const y = margin + Math.floor(i / columns) * cellH;
    const inner = cloudToSvg(cloud, storm.width, storm.height, {
      font: opts.font,
      background: null,
      standalone: false,
    });
    return (
      `<g transform="translate(${x} ${y})">${inner}` +
      `<text x="${storm.width / 2}" y="${storm.height + 24}" text-anchor="middle" ` +
      `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="15" font-weight="500" ` +
      `fill="${labelColor}">${escapeXml(cloud.name)}</text></g>`
    );
  });
  const W = columns * cellW - gap + 2 * margin;
  const H = rows * cellH - gap + 2 * margin;
  const bg = background ? `<rect width="100%" height="100%" fill="${background}"/>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `${style(opts.css)}${bg}${parts.join('')}</svg>`
  );
}

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}
