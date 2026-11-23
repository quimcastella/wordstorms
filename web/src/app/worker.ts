import { generateStorm, type Doc, type StormOptions } from '../core/storm.ts';
import { createCanvasMeasurer } from '../measure/canvas.ts';
import { loadFont, type FontFaces } from './fonts.ts';

export interface StormRequest {
  docs: Doc[];
  options: Partial<StormOptions>;
  /** The font to load before measuring (absolute URLs). */
  font: FontFaces;
}

export type StormResponse =
  | { type: 'progress'; message: string }
  | { type: 'done'; storm: ReturnType<typeof generateStorm> }
  | { type: 'error'; message: string }
  /** This browser can't load fonts or draw text in a worker; the page should do it instead. */
  | { type: 'unsupported' };

const scope = self as unknown as DedicatedWorkerGlobalScope & { fonts?: FontFaceSet };

scope.onmessage = async (event: MessageEvent<StormRequest>) => {
  const { docs, options, font } = event.data;
  const post = (msg: StormResponse) => scope.postMessage(msg);
  if (typeof OffscreenCanvas === 'undefined' || (font.face && !scope.fonts)) {
    post({ type: 'unsupported' });
    return;
  }
  try {
    if (font.face) await loadFont(scope.fonts!, font);
    const measurer = createCanvasMeasurer((w, h) => new OffscreenCanvas(w, h), font.spec);
    const storm = generateStorm(docs, options, measurer, (message) => post({ type: 'progress', message }));
    post({ type: 'done', storm });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
