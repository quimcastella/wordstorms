/** Layout quality measures, used to compare the port against the Java reference. */

export interface LayoutWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layout {
  width: number;
  height: number;
  clouds: { name: string; words: LayoutWord[] }[];
}

export interface LayoutMetrics {
  /** Mean distance (px) of a shared word's center from its mean center across clouds. Lower = more coordinated. */
  coordinationPx: number;
  /** Overlapping word-box pairs per cloud. */
  overlapsPerCloud: number;
  /** Overlap area as a share of total word-box area. */
  overlapShare: number;
  /** Total word-box area as a share of the frame. Higher = bigger, denser words. */
  fill: number;
}

export function layoutMetrics(layout: Layout): LayoutMetrics {
  const centers = new Map<string, { x: number; y: number }[]>();
  let overlaps = 0;
  let overlapArea = 0;
  let wordArea = 0;
  for (const cloud of layout.clouds) {
    const ws = cloud.words;
    for (const w of ws) {
      wordArea += w.width * w.height;
      const list = centers.get(w.text) ?? [];
      list.push({ x: w.x + w.width / 2, y: w.y + w.height / 2 });
      centers.set(w.text, list);
    }
    for (let i = 0; i < ws.length; i++) {
      for (let j = i + 1; j < ws.length; j++) {
        const a = ws[i];
        const b = ws[j];
        const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (ox > 0.5 && oy > 0.5) {
          overlaps++;
          overlapArea += ox * oy;
        }
      }
    }
  }
  let dist = 0;
  let n = 0;
  for (const pts of centers.values()) {
    if (pts.length < 2) continue;
    const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    for (const p of pts) {
      dist += Math.hypot(p.x - mx, p.y - my);
      n++;
    }
  }
  const clouds = layout.clouds.length || 1;
  return {
    coordinationPx: n ? dist / n : 0,
    overlapsPerCloud: overlaps / clouds,
    overlapShare: wordArea ? overlapArea / wordArea : 0,
    fill: wordArea / (clouds * layout.width * layout.height),
  };
}

/** Mean Jaccard similarity between the word sets of matching clouds. */
export function vocabularyAgreement(a: Layout, b: Layout): number {
  let total = 0;
  const n = Math.min(a.clouds.length, b.clouds.length);
  for (let i = 0; i < n; i++) {
    const sa = new Set(a.clouds[i].words.map((w) => w.text));
    const sb = new Set(b.clouds[i].words.map((w) => w.text));
    const inter = [...sa].filter((w) => sb.has(w)).length;
    total += inter / (sa.size + sb.size - inter || 1);
  }
  return n ? total / n : 0;
}
