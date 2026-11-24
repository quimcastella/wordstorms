import { describe, expect, it } from 'vitest';
import { mergeDocs } from '../src/app/documents.ts';

const doc = (name: string, text = name) => ({ name, text });

describe('mergeDocs', () => {
  it('keeps documents that share a name, numbering the later ones', () => {
    const docs = mergeDocs([doc('README', 'one')], [doc('README', 'two'), doc('README', 'three')]);
    expect(docs).toEqual([doc('README', 'one'), doc('README (2)', 'two'), doc('README (3)', 'three')]);
  });

  it('numbers duplicates within one batch', () => {
    expect(mergeDocs([], [doc('README', 'a'), doc('README', 'b')]).map((d) => d.name)).toEqual(['README', 'README (2)']);
  });

  it('does not add the same document twice', () => {
    expect(mergeDocs([doc('README', 'a')], [doc('README', 'a')])).toEqual([doc('README', 'a')]);
  });

  it('skips numbers already used by other documents', () => {
    const docs = mergeDocs([doc('README', 'a'), doc('README (2)', 'b')], [doc('README', 'c')]);
    expect(docs.map((d) => d.name)).toEqual(['README', 'README (2)', 'README (3)']);
  });

  it('sorts by name with numbers in order', () => {
    expect(mergeDocs([doc('Text 10')], [doc('Text 2'), doc('Alpha')]).map((d) => d.name)).toEqual(['Alpha', 'Text 2', 'Text 10']);
  });
});
