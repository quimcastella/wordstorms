# Word Storm

**Compare documents with coordinated word clouds.** A word storm is a group of
word clouds, one per document. Words that appear in several documents get the
same position, color and angle in every cloud, so similar documents look
similar and what's distinctive stands out.

![Word Storm](examples/images/complex.png)

## Use it

**In your browser:** open the web app, drop in some `.txt` files (one per
document), and download the result as SVG, PNG or JSON. Everything runs
locally; your files never leave your computer.

> The app deploys to GitHub Pages from `master` (see
> [.github/workflows/web.yml](.github/workflows/web.yml)). Until then, run it
> locally as shown below.

Things you can change:

Above the clouds:

- **Word storm or separate clouds:** coordinated layout, or ordinary
  independent clouds for comparison.
- **New layout** (or press R): another arrangement of the same words.

In the panel:

- **Words per cloud** (10–80, default 35).
- **Favor distinctive words:** from plain word counts to words each document
  uses more than the others do (keyness). Unlike tf-idf, words that every
  document uses can still appear, so the clouds keep shared words to line up.
- **Ignore these words.**
- **Set shared words apart by:**
  - **None** (default): a random palette color per word, as in the original.
  - **Weight**: words only one document uses are drawn in a light weight,
    and shared words stay bold. Anton has only one weight, so this option
    changes nothing with that font.
  - **Warm/cool**: shared words get the palette's warm colors, and words
    only one document uses get its cool ones.
- **Size differences:** how much bigger frequent words get. The default is
  the original's linear scale; toward Dramatic the top words get bigger
  still, toward Even sizes even out.
- **Vertical words:** from none to all (default 29%, the original's 2 in 7).
- **Font:** Oswald (default, a condensed sans that packs tightly), Bricolage
  Grotesque, Anton, Fraunces, Zilla Slab (a slab, like the original's
  ChunkFive), or your system font. All are open-source Google Fonts,
  self-hosted, and embedded in SVG/PNG downloads.
- **Colors:** Storm, Ocean, Sunset, Forest, Midnight (dark), Ink, or Classic
  (the original random colors). Every palette color has at least 3:1
  contrast against its background.
- Under More options: cloud shape, fading words every document uses (as in
  the original), and the layout number (the random seed).

Hover a word to highlight it in every cloud; click to pin it.

## Run it locally

Needs [Node.js](https://nodejs.org) 22.18 or newer.

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:5173. The page opens on an example; pick another
with the chips under the drop zone, or link to one with `?example=<id>`:

| `?example=` | Corpus |
|---|---|
| `shakespeare` | Hamlet, Macbeth, Othello vs. A Midsummer Night's Dream, Twelfth Night, Much Ado About Nothing (dialogue only) |
| `holmes` | The four Sherlock Holmes novels |
| `fairytales` | Grimm, Andersen, Perrault, Aesop, Arabian Nights, Japanese fairy tales |

The literary texts are public domain, from Project Gutenberg;
`npm run build-corpora` rebuilds them (it downloads from a Gutenberg mirror
and strips the Gutenberg boilerplate, front matter, and for plays the speaker
names and stage directions).

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit and layout tests |
| `npm run typecheck` | TypeScript checks |
| `npm run compare` | Lays out the example data and compares it with the original Java output in [reference/](reference/); writes SVGs to `web/out/` |
| `npm run render-examples` | Renders every example to PNG in `web/out/examples/` |
| `npm run build-corpora` | Rebuilds the example texts from Project Gutenberg |
| `npm run build` | Production build in `web/dist/` |

## Use it as a library

The layout code has no DOM dependency; give it a way to measure text.

```ts
import { generateStorm, createCanvasMeasurer, stormToSvg } from './web/src/index.ts';

const measurer = createCanvasMeasurer((w, h) => new OffscreenCanvas(w, h));
const storm = generateStorm(
  [
    { name: 'Obama', text: '…' },
    { name: 'Romney', text: '…' },
  ],
  { mode: 'coordinated', maxWords: 25 },
  measurer,
);
const svg = stormToSvg(storm);
```

`JAVA_OPTIONS` reproduces the original version's word choice and look
(`generateStorm(docs, { ...JAVA_OPTIONS }, measurer)`).

In Node, pass a canvas from [`@napi-rs/canvas`](https://www.npmjs.com/package/@napi-rs/canvas) instead
(see [web/scripts/compare-reference.ts](web/scripts/compare-reference.ts)).

## How it works

1. **Pick words.** Each document's most frequent words, minus common English
   words like "the" and "and", boosted by how much more this document uses
   them than the others.
2. **Place shared words together.** A word that appears in several documents is
   placed at the average of its positions, cloud by cloud, until positions
   settle.
3. **Refine.** A force layout pulls each shared word toward its position in
   similar documents, pushes overlapping words apart and keeps clouds compact.
4. **Fill in.** Words unique to one document fill the space around them.

[ALGORITHM.md](ALGORITHM.md) has the full spec, including where the port
deliberately differs from the original.

The method is from Quim Castella and Charles Sutton, *Word Storms: Multiples of
Word Clouds for Visual Comparison of Documents*, WWW 2014.

## Repository layout

| Path | What |
|---|---|
| [web/](web/) | The TypeScript implementation and web app |
| [web/src/core/](web/src/core/) | Text processing, collision detection, layout (no DOM) |
| [ALGORITHM.md](ALGORITHM.md) | The algorithm, as implemented |
| [examples/](examples/) | Example documents and images |
| [src/](src/), [library/](library/) | The original Java implementation (built on WordCram and Processing 1.2) |
| [reference/](reference/) | Runs the Java version and saves its layouts as JSON, to check the port against |

### The original Java version

The Java code still works for reproducing the paper's results, but it is no
longer the recommended way to make word storms. Processing 1.2 depends on
`java.applet`, which was removed in JDK 26, so
[reference/run.sh](reference/run.sh) patches in an empty stand-in for those
classes:

```bash
JAVA_HOME=/path/to/jdk ./reference/run.sh
```

## License

Apache 2.0. See [LICENSE.txt](LICENSE.txt). Built originally on
[WordCram](https://github.com/danbernier/WordCram); English stop words from
cue.language by Jonathan Feinberg (Apache 2.0).
