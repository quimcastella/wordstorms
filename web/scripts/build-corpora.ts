// Builds the example corpora in ../examples/data/input/ from public-domain
// Project Gutenberg texts.
//
//   node scripts/build-corpora.ts [cache-dir]
//
// Downloads each book once into cache-dir (default: .cache/gutenberg) from the
// Project Gutenberg Literary Archive Foundation mirror, strips the Gutenberg
// header/footer and front matter, and for plays removes speaker names and
// stage directions. The texts are public domain; removing the Gutenberg
// boilerplate means the Project Gutenberg trademark license no longer applies.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Book {
  id: number;
  name: string;
  /** The body starts right after the first match (skips introductions). */
  startAfter?: RegExp;
  /** The body ends at the first match (skips publisher back matter). */
  endAt?: RegExp;
}

interface Corpus {
  folder: string;
  kind: 'play' | 'prose';
  books: Book[];
}

const CORPORA: Corpus[] = [
  {
    folder: 'Shakespeare',
    kind: 'play',
    books: [
      { id: 1524, name: 'Hamlet' },
      { id: 1533, name: 'Macbeth' },
      { id: 1531, name: 'Othello' },
      { id: 1514, name: 'A Midsummer Night’s Dream' },
      { id: 1526, name: 'Twelfth Night' },
      { id: 1519, name: 'Much Ado About Nothing' },
    ],
  },
  {
    folder: 'SherlockHolmes',
    kind: 'prose',
    books: [
      { id: 244, name: 'A Study in Scarlet' },
      { id: 2097, name: 'The Sign of the Four' },
      { id: 2852, name: 'The Hound of the Baskervilles' },
      { id: 3289, name: 'The Valley of Fear' },
    ],
  },
  {
    folder: 'FairyTales',
    kind: 'prose',
    books: [
      { id: 2591, name: 'Grimm' },
      { id: 1597, name: 'Andersen' },
      // Skip the scholarly introduction (signed by Thomas Bodkin) and the publisher's list at the end.
      { id: 29021, name: 'Perrault', startAfter: /^_?THOMAS BODKIN_?$/m, endAt: /^_?Uniform with this Volume/m },
      { id: 21, name: 'Aesop' },
      { id: 128, name: 'Arabian Nights' },
      { id: 4018, name: 'Japanese Fairy Tales' },
    ],
  },
];

const here = dirname(fileURLToPath(import.meta.url));
const outRoot = join(here, '..', '..', 'examples', 'data', 'input');
const cache = process.argv[2] ?? join(here, '..', '.cache', 'gutenberg');
const MIRROR = 'https://gutenberg.pglaf.org';

async function fetchBook(id: number): Promise<string> {
  const file = join(cache, `pg${id}.txt`);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const digits = String(id);
  const dir = [...digits.slice(0, -1)].join('/');
  for (const [name, encoding] of [
    [`${id}-0.txt`, 'utf-8'],
    [`${id}.txt`, 'utf-8'],
    [`${id}-8.txt`, 'latin1'],
  ] as const) {
    const res = await fetch(`${MIRROR}/${dir ? `${dir}/` : ''}${id}/${name}`);
    if (!res.ok) continue;
    const text = new TextDecoder(encoding).decode(await res.arrayBuffer());
    mkdirSync(cache, { recursive: true });
    writeFileSync(file, text);
    return text;
  }
  throw new Error(`Could not download Gutenberg ebook ${id}`);
}

/** The text between Gutenberg's START and END markers, minus its notes about other editions. */
function body(raw: string): string {
  const text = raw.replace(/\r\n?/g, '\n');
  const start = text.search(/^\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG.*$/im);
  const from = start >= 0 ? text.indexOf('\n', start) + 1 : 0;
  const rest = text.slice(from);
  // Newer files end with "*** END OF THE PROJECT GUTENBERG…"; older ones with "End of Project Gutenberg's…".
  const end = rest.search(/^(\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG|End of (the )?Project Gutenberg)/im);
  return (end >= 0 ? rest.slice(0, end) : rest)
    .replace(/^Note: Project Gutenberg also has an HTML version[\s\S]*?\n\n/m, '');
}

/** Drops everything before the first chapter/act, plus markup and headings. */
function cleanProse(text: string): string {
  const firstChapter = text.search(/^\s*(CHAPTER|Chapter) (I|1|ONE)\b\.?/m);
  const kept = firstChapter > 0 && firstChapter < text.length * 0.2 ? text.slice(firstChapter) : text;
  return kept
    .replace(/\[(Illustration|Footnote)[^\]]*\]/gs, ' ')
    .replace(/^\s*(CHAPTER|Chapter|VOLUME|Volume|PART|Part)\b.*$/gm, ' ')
    .replace(/_/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Keeps only spoken lines: no cast list, act/scene headings, speaker names or stage directions. */
function cleanPlay(text: string): string {
  const cast = text.search(/^Dramatis Person/m);
  const firstAct = text.indexOf('\nACT I\n', cast >= 0 ? cast : 0);
  const kept = firstAct >= 0 ? text.slice(firstAct) : text;
  return kept
    .replace(/\[[^\]]*\]/gs, ' ') // [_Exit._], [Exeunt.]
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^\s/.test(line)) return false; // indented stage directions
      if (/^(ACT|SCENE|Scene)\b/.test(t)) return false;
      if (!/[a-z]/.test(t)) return false; // speaker names (ALL CAPS) and headings
      return true;
    })
    .join('\n')
    // Unindented stage directions are paragraphs of their own: "Enter Horatio and Marcellus."
    .split(/\n\s*\n/)
    .filter((para) => !/^\s*(Enter|Re-enter|Exit|Exeunt)\b/.test(para))
    .join('\n\n')
    .replace(/_/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

for (const corpus of CORPORA) {
  const dir = join(outRoot, corpus.folder);
  mkdirSync(dir, { recursive: true });
  for (const book of corpus.books) {
    let text = body(await fetchBook(book.id));
    const start = book.startAfter?.exec(text);
    if (start) text = text.slice(start.index + start[0].length);
    const end = book.endAt?.exec(text);
    if (end) text = text.slice(0, end.index);
    const clean = corpus.kind === 'play' ? cleanPlay(text) : cleanProse(text);
    writeFileSync(join(dir, `${book.name}.txt`), clean + '\n');
    const words = clean.match(/\S+/g)?.length ?? 0;
    console.log(`${corpus.folder.padEnd(15)} ${book.name.padEnd(30)} ${String(words).padStart(7)} words`);
  }
}
