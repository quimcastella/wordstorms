# Word Storms

**Word clouds that line up, so you can compare documents.** Make one cloud per
document: words they share keep the same place, color and angle in every
cloud, so similar documents look similar and what's distinctive stands out.

**Try it at [wordstorms.org](https://wordstorms.org).** It runs in your
browser, and your files never leave your computer.

![A word storm of three Shakespeare tragedies and three comedies](docs/images/shakespeare.png)

Word storms come from the paper
[*Word Storms: Multiples of Word Clouds for Visual Comparison of Documents*](https://arxiv.org/abs/1301.0503)
by Quim Castella and Charles Sutton (WWW 2014). This repository has the code
behind the site, a command-line tool, and a TypeScript library.

## On the site

- **Explore examples:** Shakespeare's tragedies and comedies, the four Sherlock
  Holmes novels, and six collections of fairy tales and fables. Each has its own
  look, a short note on what the clouds show, and an explanation of every
  setting.
- **Make your own:** drop in some `.txt` files, one per document, change the
  settings, try new layouts, and download the clouds as SVG or PNG (a .zip with
  one file per cloud) or the whole layout as JSON.

Hover a word to find it in every cloud; click to pin it.

## Run it locally

You need [Node.js](https://nodejs.org) 22.18 or newer.

```bash
git clone https://github.com/quimcastella/wordstorms.git
cd wordstorms/web
npm install
npm run dev
```

Then open http://localhost:5173. Link to an example with `?example=shakespeare`
(or `holmes`, `fairytales`), or go straight to Make your own with `#create`.

## Command line

`npm run storm` makes a storm from text files and writes one SVG and one PNG
per cloud, all the same size so shared words line up when you stack them. Run
it from the `web/` folder:

```bash
# One cloud per file in a folder
npm run storm -- path/to/folder

# Some files, with options
npm run storm -- a.txt b.txt c.txt --words 40 --distinct 30 --palette ocean --out my-storm

# A built-in example, in its own look
npm run storm -- --example holmes
```

| Option | What it does | Default |
|---|---|---|
| `-o, --out <dir>` | Where to write the files | `out/storm` |
| `-f, --format <list>` | `svg`, `png` and/or `json`, comma-separated | `svg,png` |
| `--separate` | Lay out each cloud on its own instead of as a storm | |
| `-w, --words <n>` | Words per cloud | 35 |
| `-d, --distinct <0-100>` | Favor words a document uses more than the others, in % | 20 |
| `--size <0.5-1.5>` | Size differences: 1 is the original scale, higher is more dramatic | 1 |
| `--vertical <0-1>` | Share of vertical words | 0.29 |
| `--mark <how>` | Set shared words apart: `none`, `weight` or `warmth` | `none` |
| `-p, --palette <name>` | `storm`, `ocean`, `sunset`, `crayon`, `forest`, `midnight`, `parchment`, `ink`, `classic` | `storm` |
| `--font <id>` | `oswald`, `bricolage`, `anton`, `fraunces`, `zilla`, `playfair`, `abril`, `fredoka`, `system` | `oswald` |
| `--shape <WxH>` | Cloud size in pixels | `640x480` |
| `--ignore <words>` | Extra words to leave out, comma-separated | |
| `-s, --seed <n>` | Layout number; the same number gives the same layout | 123456 |
| `--example <id>` | Use a built-in example's documents and look; other options override it | |

Folders are read for `.txt` and `.md` files, and each file name becomes its
cloud's title. SVGs embed their font, so they look the same anywhere.

## The settings

The site and the command line share these:

- **Words per cloud:** how many of each document's top words to draw. Common
  English words ("the", "and", "said") are always left out.
- **Favor distinctive words:** at 0, words are sized by how often they appear.
  Turning it up boosts words a document uses more than the others do, which
  brings out names and topics. Unlike tf-idf, words every document uses can
  still appear, so the clouds keep shared words to line up.
- **Set shared words apart:** by weight (words only one document uses are drawn
  thin) or by warm and cool colors (warm for shared words). Off by default.
- **Size differences, vertical words, colors, font, cloud shape** and the
  **layout number** change the look.
- **Word storm or separate clouds:** separate clouds are laid out one by one,
  like an ordinary word cloud, for comparison.

## Use it as a library

The layout code has no DOM dependency. Give it a way to measure text: a canvas
in the browser, or [`@napi-rs/canvas`](https://www.npmjs.com/package/@napi-rs/canvas)
in Node.

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
(`generateStorm(docs, { ...PAPER_OPTIONS }, measurer)`).
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

## Tweak it

| To change | Look in |
|---|---|
| An example's look (font, colors, settings, layout number, hidden ignore list) and its note | [web/src/app/example-list.ts](web/src/app/example-list.ts) |
| Colors | [web/src/core/palettes.ts](web/src/core/palettes.ts) (a test checks every color has 3:1 contrast with its background) |
| Fonts | [web/src/app/font-list.ts](web/src/app/font-list.ts) and [web/src/app/fonts.ts](web/src/app/fonts.ts) ([Fontsource](https://fontsource.org) packages) |
| Word choice and layout | [web/src/core/](web/src/core/) |
| The page | [web/index.html](web/index.html), [web/src/app/](web/src/app/) |

After changing an example, `npm run render-examples` renders all three to PNG
in `web/out/examples/`. The example texts are public domain, from Project
Gutenberg; `npm run build-corpora` downloads and cleans them again (it strips
the Gutenberg boilerplate and, for plays, speaker names and stage directions).

All commands run from `web/`:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run storm -- …` | Makes a storm from text files (see [Command line](#command-line)) |
| `npm test` | Unit and layout tests |
| `npm run typecheck` | TypeScript checks |
| `npm run render-examples` | Renders the examples to PNG in `web/out/examples/` |
| `npm run build-corpora` | Rebuilds the example texts from Project Gutenberg |
| `npm run build` | Production build in `web/dist/` |

## Repository layout

| Path | What |
|---|---|
| [web/src/core/](web/src/core/) | Text processing, collision detection and layout (no DOM) |
| [web/src/render/](web/src/render/) | SVG output |
| [web/src/app/](web/src/app/) | The site |
| [web/scripts/](web/scripts/) | Command line, example rendering, corpus building |
| [web/test/](web/test/) | Tests |
| [examples/](examples/) | The example texts |
| [ALGORITHM.md](ALGORITHM.md) | The algorithm, step by step |
| [archive/](archive/) | Keepsakes from the original 2012 Java version; the full code is at the `java-original` tag |

## Deploying

[.github/workflows/web.yml](.github/workflows/web.yml) tests every push and
pull request, and publishes the site to GitHub Pages from `master`. To serve it
at wordstorms.org: in the repository's Settings → Pages, set the source to
"GitHub Actions" and the custom domain to `wordstorms.org`, then point the
domain's DNS at GitHub Pages as GitHub describes there. The build uses relative
paths, so it also works from a sub-path.

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
