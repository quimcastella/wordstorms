import { generateStorm, type Doc, type StormOptions } from '../core/storm.ts';
import { createCanvasMeasurer } from '../measure/canvas.ts';

export interface StormRequest {
  docs: Doc[];
  options: Partial<StormOptions>;
  fontFamily: string;
}

export type StormResponse =
  | { type: 'progress'; message: string }
  | { type: 'done'; storm: ReturnType<typeof generateStorm> }
  | { type: 'error'; message: string };

self.onmessage = (event: MessageEvent<StormRequest>) => {
  const { docs, options, fontFamily } = event.data;
  const post = (msg: StormResponse) => self.postMessage(msg);
  try {
    const measurer = createCanvasMeasurer((w, h) => new OffscreenCanvas(w, h), fontFamily);
    const storm = generateStorm(docs, options, measurer, (message) => post({ type: 'progress', message }));
    post({ type: 'done', storm });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
