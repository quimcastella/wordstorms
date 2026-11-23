// Loads the built-in example corpora; each text is only downloaded when picked.
import type { TextDoc } from '../core/storm.ts';
import { EXAMPLES, type Example, type ExampleLook } from './example-list.ts';

export { EXAMPLES, type Example, type ExampleLook };

const files = import.meta.glob<string>('../../../examples/*/*.txt', { query: '?raw', import: 'default' });

export const exampleById = (id: string | null) => EXAMPLES.find((e) => e.id === id);

export async function loadExampleDocs(example: Example): Promise<TextDoc[]> {
  return Promise.all(
    example.docs.map(async (name) => {
      const load = files[`../../../examples/${example.folder}/${name}.txt`];
      if (!load) throw new Error(`Missing example file ${example.folder}/${name}.txt`);
      return { name, text: await load() };
    }),
  );
}
