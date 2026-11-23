// Lays out a storm off the main thread, with a fallback to the page, and
// loads fonts on the page so the result can be drawn.
import { generateStorm, type Doc, type Storm, type StormOptions } from '../core/storm.ts';
import { createCanvasMeasurer } from '../measure/canvas.ts';
import { absoluteFaces, loadFont, type CloudFont } from './fonts.ts';
import type { StormRequest, StormResponse } from './worker.ts';

const pageFaces = new Map<string, Promise<void>>();

/** Loads a font's regular (or light) weight on the page, once. */
export function pageFont(font: CloudFont, light: boolean): Promise<void> {
  const key = `${font.id}|${light}`;
  let loaded = pageFaces.get(key);
  if (!loaded) {
    loaded = loadFont(document.fonts, light ? { ...font, files: [] } : { ...font, lightFiles: [] });
    pageFaces.set(key, loaded);
  }
  return loaded;
}

export interface Job {
  /** Resolves once the storm is laid out and its font is ready on the page; never settles if cancelled. */
  promise: Promise<Storm>;
  cancel(): void;
}

export function computeStorm(
  docs: Doc[],
  options: Partial<StormOptions>,
  font: CloudFont,
  onProgress?: (message: string) => void,
): Job {
  const request: StormRequest = { docs, options, font: absoluteFaces(font) };
  let worker: Worker | null = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const laidOut = new Promise<Storm>((resolve, reject) => {
    const w = worker!;
    w.onmessage = (e: MessageEvent<StormResponse>) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        onProgress?.(msg.message);
        return;
      }
      w.terminate();
      worker = null;
      if (msg.type === 'done') resolve(msg.storm);
      else if (msg.type === 'error') reject(new Error(msg.message));
      else runOnPage(request, font).then(resolve, reject);
    };
    w.onerror = (e) => reject(new Error(e.message));
    w.postMessage(request);
  });
  return {
    // The worker loaded the font for itself; the page needs it too, to draw.
    promise: laidOut.then(async (storm) => {
      await Promise.all([pageFont(font, false), pageFont(font, true)]).catch(() => {});
      return storm;
    }),
    cancel() {
      worker?.terminate();
      worker = null;
    },
  };
}

/** Fallback for browsers that can't draw text in a worker: lay out on the page. */
async function runOnPage(request: StormRequest, font: CloudFont): Promise<Storm> {
  await Promise.all([pageFont(font, false), pageFont(font, true)]);
  await new Promise((r) => setTimeout(r, 30));
  const measurer = createCanvasMeasurer((w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }), font.spec);
  return generateStorm(request.docs, request.options, measurer);
}
