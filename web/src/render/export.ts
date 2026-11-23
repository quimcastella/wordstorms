// Helpers for saving a storm's clouds as separate files (used by the site's
// downloads and the command line).
import type { Cloud, Storm } from '../core/storm.ts';

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

/** A file name per cloud from its name, safe on every OS and unique within the storm. */
export function cloudFileNames(s: Storm, ext: string): string[] {
  const used = new Set<string>();
  return s.clouds.map((c, i) => {
    const base = c.name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim() || `cloud ${i + 1}`;
    let name = `${base}.${ext}`;
    for (let k = 2; used.has(name.toLowerCase()); k++) name = `${base} (${k}).${ext}`;
    used.add(name.toLowerCase());
    return name;
  });
}
