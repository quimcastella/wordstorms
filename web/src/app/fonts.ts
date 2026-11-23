// Fonts offered for clouds. All are open-source (SIL OFL) and self-hosted via
// Fontsource, so they load in the layout worker and can be embedded in exports.
import antonLatin from '@fontsource/anton/files/anton-latin-400-normal.woff2?url';
import antonLatinExt from '@fontsource/anton/files/anton-latin-ext-400-normal.woff2?url';
import bricolageLatin from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2?url';
import bricolageLatinExt from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-ext-700-normal.woff2?url';
import frauncesLatin from '@fontsource/fraunces/files/fraunces-latin-600-normal.woff2?url';
import frauncesLatinExt from '@fontsource/fraunces/files/fraunces-latin-ext-600-normal.woff2?url';
import oswaldLatin from '@fontsource/oswald/files/oswald-latin-600-normal.woff2?url';
import oswaldLatinExt from '@fontsource/oswald/files/oswald-latin-ext-600-normal.woff2?url';
import zillaLatin from '@fontsource/zilla-slab/files/zilla-slab-latin-600-normal.woff2?url';
import zillaLatinExt from '@fontsource/zilla-slab/files/zilla-slab-latin-ext-600-normal.woff2?url';
import { DEFAULT_FONT, type FontSpec } from '../measure/canvas.ts';

// Unicode ranges from Fontsource's CSS for the latin and latin-ext subsets.
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

export interface FontFile {
  url: string;
  unicodeRange: string;
}

export interface CloudFont {
  id: string;
  label: string;
  note: string;
  /** Name registered with @font-face; empty for system fonts. */
  face: string;
  spec: FontSpec;
  files: FontFile[];
}

const files = (latin: string, latinExt: string): FontFile[] => [
  { url: latin, unicodeRange: LATIN },
  { url: latinExt, unicodeRange: LATIN_EXT },
];

export const FONTS: CloudFont[] = [
  {
    id: 'oswald',
    label: 'Oswald',
    note: 'Condensed, packs tight',
    face: 'Oswald',
    spec: { family: '"Oswald", "Arial Narrow", sans-serif', weight: 600 },
    files: files(oswaldLatin, oswaldLatinExt),
  },
  {
    id: 'bricolage',
    label: 'Bricolage',
    note: 'Modern grotesque',
    face: 'Bricolage Grotesque',
    spec: { family: '"Bricolage Grotesque", system-ui, sans-serif', weight: 700 },
    files: files(bricolageLatin, bricolageLatinExt),
  },
  {
    id: 'anton',
    label: 'Anton',
    note: 'Poster heavy',
    face: 'Anton',
    spec: { family: '"Anton", Impact, sans-serif', weight: 400 },
    files: files(antonLatin, antonLatinExt),
  },
  {
    id: 'fraunces',
    label: 'Fraunces',
    note: 'Soft serif',
    face: 'Fraunces',
    spec: { family: '"Fraunces", Georgia, serif', weight: 600 },
    files: files(frauncesLatin, frauncesLatinExt),
  },
  {
    id: 'zilla',
    label: 'Zilla Slab',
    note: 'Slab, like the original',
    face: 'Zilla Slab',
    spec: { family: '"Zilla Slab", Rockwell, serif', weight: 600 },
    files: files(zillaLatin, zillaLatinExt),
  },
  {
    id: 'system',
    label: 'System',
    note: 'Your device’s sans',
    face: '',
    spec: { family: DEFAULT_FONT, weight: 400 },
    files: [],
  },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

/** Absolute URLs, so a worker can load them too. */
export const absoluteFiles = (font: CloudFont): FontFile[] =>
  font.files.map((f) => ({ ...f, url: new URL(f.url, location.href).href }));

/** Registers a font's faces with a FontFaceSet (document.fonts or a worker's self.fonts) and waits for them. */
export async function loadFont(
  fonts: FontFaceSet,
  face: string,
  weight: number,
  fontFiles: FontFile[],
): Promise<void> {
  await Promise.all(
    fontFiles.map(async ({ url, unicodeRange }) => {
      const ff = new FontFace(face, `url(${url})`, { weight: String(weight), unicodeRange });
      fonts.add(ff);
      await ff.load();
    }),
  );
}

const embedded = new Map<string, Promise<string>>();

/** @font-face rules with the font files inlined, for standalone SVG/PNG exports. */
export function embeddedFontCss(font: CloudFont): Promise<string> {
  if (!font.face) return Promise.resolve('');
  let css = embedded.get(font.id);
  if (!css) {
    css = Promise.all(
      font.files.map(async ({ url, unicodeRange }) => {
        const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return (
          `@font-face{font-family:"${font.face}";font-weight:${font.spec.weight};` +
          `src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2");unicode-range:${unicodeRange}}`
        );
      }),
    ).then((rules) => rules.join(''));
    embedded.set(font.id, css);
  }
  return css;
}
