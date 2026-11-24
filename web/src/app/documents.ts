import type { TextDoc } from '../core/storm.ts';

/**
 * Adds documents to a list, sorted by name. A document that is already there, same name and same
 * text, is not added twice. One that only shares a name gets a number, "README (2)", so several
 * files called the same thing (the READMEs of different projects) can be compared.
 */
export function mergeDocs(existing: TextDoc[], added: TextDoc[]): TextDoc[] {
  const docs = [...existing];
  const taken = new Set(docs.map((d) => d.name));
  for (const d of added) {
    if (docs.some((x) => x.name === d.name && x.text === d.text)) continue;
    let name = d.name;
    for (let k = 2; taken.has(name); k++) name = `${d.name} (${k})`;
    taken.add(name);
    docs.push(name === d.name ? d : { ...d, name });
  }
  return docs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
