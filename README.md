# Word Storms

**Word clouds that line up, so you can compare documents.** Make one cloud per
document: words they share keep the same place, color and angle in every
cloud, so similar documents look similar and what's distinctive stands out.

**Try it at [wordstorms.org](https://wordstorms.org).** Explore the examples
(Shakespeare, Sherlock Holmes, fairy tales) or drop in your own `.txt` files
and download the clouds. It runs in your browser, and your files never leave
your computer.

![A word storm of three Shakespeare tragedies and three comedies](docs/images/shakespeare.png)

Word storms come from the paper
[*Word Storms: Multiples of Word Clouds for Visual Comparison of Documents*](https://arxiv.org/abs/1301.0503)
by Quim Castella and Charles Sutton (WWW 2014). This repository has the code
behind the site, a command-line tool, and a TypeScript library.

## Getting started

You need [Node.js](https://nodejs.org) 22.18 or newer. Everything lives in
`web/`, and the `npm run` commands below run from there.

```bash
git clone https://github.com/quimcastella/wordstorms.git
cd wordstorms/web
npm install
```

## Command line

`wordstorms` makes a storm from text files and writes one SVG and one PNG per
cloud into `./wordstorm`, all the same size so shared words line up when you
stack them. It needs only Node.js, not a clone:

```bash
# One cloud per file in a folder
npx wordstorms path/to/folder

# Some files, with options
npx wordstorms a.txt b.txt c.txt --words 40 --distinct 30 --palette ocean --out my-storm

# A built-in example, in its own look
npx wordstorms --example holmes
```

From a clone, `npm run storm -- <same arguments>` in `web/` runs the source
directly; paths are relative to where you run it.

| Option | What it does | Default |
|---|---|---|
| `-o, --out <dir>` | Where to write the files | `./wordstorm` |
| `-f, --format <list>` | `svg`, `png` and/or `json`, comma-separated | `svg,png` |
| `--separate` | Lay out each cloud on its own, like an ordinary word cloud, instead of as a storm | |
| `-w, --words <n>` | Words per cloud; common English words ("the", "and", "said") are always left out | 35 |
| `-d, --distinct <0-100>` | Favor words a document uses more than the others, in %. Unlike tf-idf, words every document uses can still appear, so there are shared words to line up | 20 |
| `--contrast <0.5-1.5>` | Size differences: 1 is the original scale, higher is more dramatic | 1 |
| `--vertical <0-1>` | Share of vertical words | 0.29 |
| `--mark <how>` | Set shared words apart: `none`, `weight` (words only one document uses are drawn thin) or `warmth` (warm colors for shared words) | `none` |
| `-p, --palette <name>` | `storm`, `ocean`, `sunset`, `crayon`, `forest`, `midnight`, `parchment`, `ink`, `classic` | `storm` |
| `--font <id>` | `oswald`, `bricolage`, `anton`, `fraunces`, `zilla`, `playfair`, `abril`, `fredoka`, `system` | `oswald` |
| `--size <WxH>` | Cloud size in pixels | `640x480` |
| `--ignore <words>` | Extra words to leave out, comma-separated | |
| `-s, --seed <n>` | Layout number; the same number gives the same layout | 123456 |
| `--example <id>` | Use a built-in example's documents and look; other options override it | |

Folders are read for `.txt` and `.md` files, and each file name becomes its
cloud's title. SVGs embed their font, so they look the same anywhere.

## Use it as a library

The library isn't published to npm; import it from your clone. The layout code
has no DOM dependency. Give it a way to measure text: a canvas in the browser,
or [`@napi-rs/canvas`](https://www.npmjs.com/package/@napi-rs/canvas) in Node.

```ts
import { generateStorm, createCanvasMeasurer, cloudToSvg } from './web/src/index.ts';

const measurer = createCanvasMeasurer((w, h) => new OffscreenCanvas(w, h));
const storm = generateStorm(
  [
    { name: 'Hamlet', text: '…' },
    { name: 'Macbeth', text: '…' },
  ],
  { maxWords: 40, distinctiveness: 0.3 },
  measurer,
);
const svgs = storm.clouds.map((cloud) => cloudToSvg(cloud, storm.width, storm.height));
```

`PAPER_OPTIONS` gives the settings used in the paper
(`generateStorm(docs, { ...PAPER_OPTIONS }, measurer)`). `cropStorm` trims the
clouds to a shared frame for saving, `cloudFileNames` gives safe file names,
and `drawCloud` draws a cloud on a canvas.
[web/scripts/storm.ts](web/scripts/storm.ts) is a complete Node example.

## How it works

1. **Pick the words.** Each document's most frequent words, minus common ones,
   optionally boosted by how much more this document uses them than the others.
2. **Line up shared words.** A word that appears in several documents moves to
   the average of its positions, cloud by cloud, until positions settle.
3. **Tidy up.** A force layout pulls each word toward its position in similar
   documents, pushes overlapping words apart and keeps clouds compact.
4. **Fill in.** Words only one document uses go in last, around the shared ones.

[ALGORITHM.md](ALGORITHM.md) has the full algorithm, including where this
implementation differs from the one used for the paper.

## Development

`npm run dev` starts the site at http://localhost:5173. Link to an example with
`?example=shakespeare` (or `holmes`, `fairytales`), or go straight to Make your
own with `#create`.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run storm -- …` | Makes a storm from text files (see [Command line](#command-line)) |
| `npm run build:cli` | Bundles the command line into `web/dist-cli/` for publishing (`npm publish` runs it) |
| `npm test` | Unit and layout tests |
| `npm run typecheck` | TypeScript checks |
| `npm run render-examples` | Renders the examples to PNG in `web/out/examples/` |
| `npm run build-corpora` | Rebuilds the example texts from Project Gutenberg |
| `npm run build` | Production build in `web/dist/` |

Where things are:

| Path | What's there |
|---|---|
| [web/src/core/](web/src/core/) | Word choice, collision detection and layout (no DOM); colors in [palettes.ts](web/src/core/palettes.ts), where a test checks every color has 3:1 contrast with its background |
| [web/src/render/](web/src/render/) | Drawing clouds as SVG or on a canvas, and saving them as separate files |
| [web/src/app/](web/src/app/), [web/index.html](web/index.html) | The site. Each example's look (font, colors, settings, layout number, hidden ignore list) and its note are in [example-list.ts](web/src/app/example-list.ts); fonts ([Fontsource](https://fontsource.org) packages) in [font-list.ts](web/src/app/font-list.ts) and [fonts.ts](web/src/app/fonts.ts) |
| [web/scripts/](web/scripts/) | Command line, example rendering, corpus building |
| [web/test/](web/test/) | Tests |
| [examples/](examples/) | The example texts |
| [docs/images/](docs/images/) | Images for this README |
| [archive/](archive/) | Keepsakes from the original 2012 Java version; the full code is at the `java-original` tag |

After changing an example, run `npm run render-examples` to check how all three
look. The README image is `web/out/examples/shakespeare.png` from that run,
copied to `docs/images/`. The example texts are public domain, from Project
Gutenberg; `npm run build-corpora` downloads and cleans them again (it strips
the Gutenberg boilerplate and, for plays, speaker names and stage directions).

## Citing

If you use word storms in your work, please cite the paper:

```bibtex
@inproceedings{castella2014wordstorms,
  title     = {Word Storms: Multiples of Word Clouds for Visual Comparison of Documents},
  author    = {Castella, Quim and Sutton, Charles},
  booktitle = {Proceedings of the 23rd International Conference on World Wide Web (WWW)},
  year      = {2014},
  note      = {arXiv:1301.0503}
}
```

## License

Apache 2.0. See [LICENSE.txt](LICENSE.txt). The fonts are open-source Google
Fonts, served with Fontsource. English stop words come from cue.language by
Jonathan Feinberg (Apache 2.0). The example texts are in the public domain.
