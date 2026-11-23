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
