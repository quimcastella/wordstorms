# Changelog

Changes to the `wordstorms` npm package: the command line and the library.

## 0.2.0 (2026-11-24)

### Added

- **The library is on npm.** `import { generateStorm } from 'wordstorms'` works
  in browsers and workers (text is measured with an `OffscreenCanvas` by
  default). `wordstorms/node` measures with `@napi-rs/canvas` and adds
  `cloudToPng`. Type declarations are included.
- Documents can be word weights made elsewhere, `{ name, words: { economy: 45 } }`,
  instead of text. On the command line, give `.json` files of word counts.
- Spanish and Catalan: `--language english|spanish|catalan|none` on the command
  line and the site, and the `stopwords`, `morphology` and `minWordLength`
  options. `none` keeps every word as written.
- `storm.stats` measures the layout: `sharedOffset` (how far apart shared
  words' copies are), `selectedWords` and `placedWords`, `overlap` and
  `forceConverged`.
- `storm.options` records every option a storm was made with. Saved JSON
  (`stormToJson`) also records the version and font.
- Command line: `--version`, `--no-crop` and `--scale`.
- Site: paste text as a document, and pick the language.

### Fixed

- tf-idf combined with keyness gave `NaN` weights, and tf-idf brought back
  words in every document as filler when a cloud had nothing else.
- A field too small for any word (such as `--size 0x0`) made the layout loop
  forever. Words now stop shrinking at 10% of their size, and what still
  doesn't fit is reported in `skipped`.
- Saved JSON used a different frame from the SVG, PNG and HTML files.
- A decomposed accent (`e` + U+0301) split a word in two.
- Invalid options and command-line values fail with a short message naming
  the problem.

## 0.1.1

- New npm README.

## 0.1.0

- First release: the `wordstorms` command line.
