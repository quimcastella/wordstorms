// The fonts offered for clouds, without their files, so Node scripts can use
// the list too. fonts.ts adds the file URLs for the browser.
import { DEFAULT_FONT, type FontSpec } from '../measure/canvas.ts';

export type FontId = 'oswald' | 'bricolage' | 'anton' | 'fraunces' | 'zilla' | 'playfair' | 'abril' | 'fredoka' | 'system';

export interface FontInfo {
  id: FontId;
  label: string;
  note: string;
  /** Name registered with @font-face; empty for system fonts. */
  face: string;
  spec: FontSpec;
  /** Fontsource package under @fontsource/; empty for system fonts. */
  package: string;
}

/** Unicode ranges of Fontsource's latin and latin-ext files. */
export const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
export const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

export const FONT_LIST: FontInfo[] = [
  {
    id: 'oswald',
    label: 'Oswald',
    note: 'Condensed, packs tight',
    face: 'Oswald',
    spec: { family: '"Oswald", "Arial Narrow", sans-serif', weight: 600, lightWeight: 300 },
    package: 'oswald',
  },
  {
    id: 'bricolage',
    label: 'Bricolage',
    note: 'Modern grotesque',
    face: 'Bricolage Grotesque',
    spec: { family: '"Bricolage Grotesque", system-ui, sans-serif', weight: 700, lightWeight: 300 },
    package: 'bricolage-grotesque',
  },
  {
    id: 'anton',
    label: 'Anton',
    note: 'Poster heavy',
    face: 'Anton',
    spec: { family: '"Anton", Impact, sans-serif', weight: 400 },
    package: 'anton',
  },
  {
    id: 'fraunces',
    label: 'Fraunces',
    note: 'Soft serif',
    face: 'Fraunces',
    spec: { family: '"Fraunces", Georgia, serif', weight: 600, lightWeight: 300 },
    package: 'fraunces',
  },
  {
    id: 'zilla',
    label: 'Zilla Slab',
    note: 'Slab, like the original',
    face: 'Zilla Slab',
    spec: { family: '"Zilla Slab", Rockwell, serif', weight: 600, lightWeight: 300 },
    package: 'zilla-slab',
  },
  {
    id: 'playfair',
    label: 'Playfair',
    note: 'Victorian high contrast',
    face: 'Playfair Display',
    spec: { family: '"Playfair Display", Didot, Georgia, serif', weight: 700, lightWeight: 400 },
    package: 'playfair-display',
  },
  {
    id: 'abril',
    label: 'Abril',
    note: 'Victorian poster',
    face: 'Abril Fatface',
    spec: { family: '"Abril Fatface", "Bodoni 72", Didot, serif', weight: 400 },
    package: 'abril-fatface',
  },
  {
    id: 'fredoka',
    label: 'Fredoka',
    note: 'Round and playful',
    face: 'Fredoka',
    spec: { family: '"Fredoka", "Arial Rounded MT Bold", sans-serif', weight: 600, lightWeight: 300 },
    package: 'fredoka',
  },
  {
    id: 'system',
    label: 'System',
    note: 'Your device’s sans',
    face: '',
    // Light if the device's font has a light weight (Helvetica Neue does).
    spec: { family: DEFAULT_FONT, weight: 400, lightWeight: 300 },
    package: '',
  },
];
