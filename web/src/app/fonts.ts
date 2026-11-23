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
// Light weights, for words only one document uses. Anton has none.
import bricolageLightLatin from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-300-normal.woff2?url';
import bricolageLightLatinExt from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-ext-300-normal.woff2?url';
import frauncesLightLatin from '@fontsource/fraunces/files/fraunces-latin-300-normal.woff2?url';
import frauncesLightLatinExt from '@fontsource/fraunces/files/fraunces-latin-ext-300-normal.woff2?url';
import oswaldLightLatin from '@fontsource/oswald/files/oswald-latin-300-normal.woff2?url';
import oswaldLightLatinExt from '@fontsource/oswald/files/oswald-latin-ext-300-normal.woff2?url';
import zillaLightLatin from '@fontsource/zilla-slab/files/zilla-slab-latin-300-normal.woff2?url';
import zillaLightLatinExt from '@fontsource/zilla-slab/files/zilla-slab-latin-ext-300-normal.woff2?url';
import fredokaLatin from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff2?url';
import fredokaLatinExt from '@fontsource/fredoka/files/fredoka-latin-ext-600-normal.woff2?url';
import fredokaLightLatin from '@fontsource/fredoka/files/fredoka-latin-300-normal.woff2?url';
import fredokaLightLatinExt from '@fontsource/fredoka/files/fredoka-latin-ext-300-normal.woff2?url';
import playfairLatin from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2?url';
import playfairLatinExt from '@fontsource/playfair-display/files/playfair-display-latin-ext-700-normal.woff2?url';
import playfairLightLatin from '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2?url';
import abrilLatin from '@fontsource/abril-fatface/files/abril-fatface-latin-400-normal.woff2?url';
import abrilLatinExt from '@fontsource/abril-fatface/files/abril-fatface-latin-ext-400-normal.woff2?url';
import playfairLightLatinExt from '@fontsource/playfair-display/files/playfair-display-latin-ext-400-normal.woff2?url';
import { fontWeight, type FontSpec } from '../measure/canvas.ts';
import { FONT_LIST, type FontId, type FontInfo } from './font-list.ts';

// Unicode ranges from Fontsource's CSS for the latin and latin-ext subsets.
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

export interface FontFile {
  url: string;
  unicodeRange: string;
}

/** What it takes to load a font: its @font-face name and files. */
export interface FontFaces {
  /** Name registered with @font-face; empty for system fonts. */
  face: string;
  spec: FontSpec;
  files: FontFile[];
  /** Files for `spec.lightWeight`. */
  lightFiles: FontFile[];
}

export interface CloudFont extends FontFaces, FontInfo {}

const files = (latin: string, latinExt: string): FontFile[] => [
  { url: latin, unicodeRange: LATIN },
  { url: latinExt, unicodeRange: LATIN_EXT },
];

const FILES: Record<FontId, { files: FontFile[]; lightFiles: FontFile[] }> = {
  oswald: { files: files(oswaldLatin, oswaldLatinExt), lightFiles: files(oswaldLightLatin, oswaldLightLatinExt) },
  bricolage: {
    files: files(bricolageLatin, bricolageLatinExt),
    lightFiles: files(bricolageLightLatin, bricolageLightLatinExt),
  },
  anton: { files: files(antonLatin, antonLatinExt), lightFiles: [] },
  fraunces: { files: files(frauncesLatin, frauncesLatinExt), lightFiles: files(frauncesLightLatin, frauncesLightLatinExt) },
  zilla: { files: files(zillaLatin, zillaLatinExt), lightFiles: files(zillaLightLatin, zillaLightLatinExt) },
  playfair: {
    files: files(playfairLatin, playfairLatinExt),
    lightFiles: files(playfairLightLatin, playfairLightLatinExt),
  },
  abril: { files: files(abrilLatin, abrilLatinExt), lightFiles: [] },
  fredoka: { files: files(fredokaLatin, fredokaLatinExt), lightFiles: files(fredokaLightLatin, fredokaLightLatinExt) },
  system: { files: [], lightFiles: [] },
};

export const FONTS: CloudFont[] = FONT_LIST.map((f) => ({ ...f, ...FILES[f.id] }));

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

/** With absolute URLs, so a worker can load it too. */
export function absoluteFaces({ face, spec, files, lightFiles }: FontFaces): FontFaces {
  const abs = (fs: FontFile[]) => fs.map((f) => ({ ...f, url: new URL(f.url, location.href).href }));
  return { face, spec, files: abs(files), lightFiles: abs(lightFiles) };
}

/** Every weight of a font, with its files. */
const weights = (font: FontFaces): [number, FontFile[]][] => [
  [fontWeight(font.spec), font.files],
  ...(font.lightFiles.length ? [[fontWeight(font.spec, true), font.lightFiles] as [number, FontFile[]]] : []),
];

/** Registers a font's faces with a FontFaceSet (document.fonts or a worker's self.fonts) and waits for them. */
export async function loadFont(fonts: FontFaceSet, font: FontFaces): Promise<void> {
  if (!font.face) return;
  await Promise.all(
    weights(font).flatMap(([weight, fontFiles]) =>
      fontFiles.map(async ({ url, unicodeRange }) => {
        const ff = new FontFace(font.face, `url(${url})`, { weight: String(weight), unicodeRange });
        fonts.add(ff);
        await ff.load();
      }),
    ),
  );
}

const embedded = new Map<string, Promise<string>>();

/** @font-face rules with the font files inlined, for standalone SVG/PNG exports. */
export function embeddedFontCss(font: CloudFont): Promise<string> {
  if (!font.face) return Promise.resolve('');
  let css = embedded.get(font.id);
  if (!css) {
    css = Promise.all(
      weights(font).flatMap(([weight, fontFiles]) =>
        fontFiles.map(async ({ url, unicodeRange }) => {
          const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
          let bin = '';
          for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          return (
            `@font-face{font-family:"${font.face}";font-weight:${weight};` +
            `src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2");unicode-range:${unicodeRange}}`
          );
        }),
      ),
    ).then((rules) => rules.join(''));
    embedded.set(font.id, css);
  }
  return css;
}
