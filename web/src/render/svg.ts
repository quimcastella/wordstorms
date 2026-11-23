import type { Cloud, PlacedWord, Storm } from '../core/storm.ts';
import { DEFAULT_FONT } from '../measure/canvas.ts';

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

const num = (n: number) => String(Math.round(n * 100) / 100);

export function wordToSvg(w: PlacedWord): string {
  const tx = num(w.x + w.originX);
  const ty = num(w.y + w.originY);
  const rotate = w.angle === 0 ? '' : ` rotate(${w.angle})`;
  const opacity = w.opacity < 1 ? ` fill-opacity="${num(w.opacity)}"` : '';
  return (
    `<text transform="translate(${tx} ${ty})${rotate}" font-size="${num(w.fontSize)}" ` +
    `fill="${w.color}"${opacity} data-word="${escapeXml(w.text)}">${escapeXml(w.text)}</text>`
  );
}

export interface SvgOptions {
  fontFamily?: string;
  background?: string;
  /** Adds xmlns so the SVG can be saved as a standalone file. */
  standalone?: boolean;
}

/** One cloud as an SVG document. */
export function cloudToSvg(cloud: Cloud, width: number, height: number, opts: SvgOptions = {}): string {
  const font = opts.fontFamily ?? DEFAULT_FONT;
  const xmlns = opts.standalone === false ? '' : ' xmlns="http://www.w3.org/2000/svg"';
  const bg = opts.background ? `<rect width="100%" height="100%" fill="${opts.background}"/>` : '';
  return (
    `<svg${xmlns} viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ` +
    `font-family="${escapeXml(font)}" role="img" aria-label="${escapeXml(cloud.name)}">` +
    `<title>${escapeXml(cloud.name)}</title>${bg}` +
    cloud.words.map(wordToSvg).join('') +
    `</svg>`
  );
}

/** The whole storm as a single SVG: a grid of clouds with their names underneath. */
export function stormToSvg(storm: Storm, opts: SvgOptions & { columns?: number } = {}): string {
  const n = storm.clouds.length;
  const columns = opts.columns ?? Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / columns);
  const label = 28;
  const gap = 16;
  const cellW = storm.width + gap;
  const cellH = storm.height + label + gap;
  const font = opts.fontFamily ?? DEFAULT_FONT;
  const parts = storm.clouds.map((cloud, i) => {
    const x = (i % columns) * cellW;
    const y = Math.floor(i / columns) * cellH;
    const inner = cloudToSvg(cloud, storm.width, storm.height, { ...opts, standalone: false });
    return (
      `<g transform="translate(${x} ${y})">` +
      `<rect width="${storm.width}" height="${storm.height}" fill="none" stroke="#ddd"/>` +
      inner +
      `<text x="${storm.width / 2}" y="${storm.height + 20}" text-anchor="middle" font-size="16" fill="#555">` +
      `${escapeXml(cloud.name)}</text></g>`
    );
  });
  const W = columns * cellW - gap;
  const H = rows * cellH - gap;
  const bg = opts.background ? `<rect width="100%" height="100%" fill="${opts.background}"/>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
    `font-family="${escapeXml(font)}">${bg}${parts.join('')}</svg>`
  );
}
