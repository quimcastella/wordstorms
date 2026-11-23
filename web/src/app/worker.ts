import { generateStorm, type Doc, type StormOptions } from '../core/storm.ts';
import { createCanvasMeasurer, type FontSpec } from '../measure/canvas.ts';
import { loadFont, type FontFile } from './fonts.ts';

export interface StormRequest {
  docs: Doc[];
  options: Partial<StormOptions>;
  font: FontSpec;
  /** @font-face name and files to load before measuring; empty for system fonts. */
  face: string;
  files: FontFile[];
}

export type StormResponse =
  | { type: 'progress'; message: string }
  | { type: 'done'; storm: ReturnType<typeof generateStorm> }
  | { type: 'error'; message: string }
  /** This browser can't load fonts or draw text in a worker; the page should do it instead. */
  | { type: 'unsupported' };

const scope = self as unknown as DedicatedWorkerGlobalScope & { fonts?: FontFaceSet };

scope.onmessage = async (event: MessageEvent<StormRequest>) => {
  const { docs, options, font, face, files } = event.data;
  const post = (msg: StormResponse) => scope.postMessage(msg);
  if (typeof OffscreenCanvas === 'undefined' || (face && !scope.fonts)) {
    post({ type: 'unsupported' });
    return;
  }
  try {
    if (face) await loadFont(scope.fonts!, face, font.weight ?? 400, files);
    const measurer = createCanvasMeasurer((w, h) => new OffscreenCanvas(w, h), font);
    const storm = generateStorm(docs, options, measurer, (message) => post({ type: 'progress', message }));
    post({ type: 'done', storm });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
