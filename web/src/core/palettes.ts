/**
 * Color palettes. Each one comes with the background it was designed for; every
 * color has at least 3:1 contrast against it (the WCAG bar for large text).
 */
export interface Palette {
  label: string;
  background: string;
  /** Empty means random HSB colors, as in the original Java version. */
  colors: string[];
}

export const PALETTES = {
  storm: {
    label: 'Storm',
    background: '#ffffff',
    colors: ['#1d3557', '#2a6f97', '#d62839', '#e07a1f', '#1b8a7a', '#6d597a', '#b5485d', '#264653', '#8a5a00'],
  },
  ocean: {
    label: 'Ocean',
    background: '#f6fafb',
    colors: ['#03045e', '#023e8a', '#0369a1', '#00789e', '#0b525b', '#006466', '#1e6091'],
  },
  sunset: {
    label: 'Sunset',
    background: '#fff9f4',
    colors: ['#7b2cbf', '#c9184a', '#e0294f', '#c2410c', '#b91c1c', '#9d0208', '#a4133c'],
  },
  forest: {
    label: 'Forest',
    background: '#fbfaf5',
    colors: ['#283618', '#4f5d2f', '#a0522d', '#8a6d1d', '#344e41', '#3f6b3a', '#6b4423'],
  },
  midnight: {
    label: 'Midnight',
    background: '#0f172a',
    colors: ['#f8fafc', '#7dd3fc', '#fda4af', '#fde68a', '#86efac', '#c4b5fd', '#fdba74'],
  },
  ink: {
    label: 'Ink',
    background: '#ffffff',
    colors: ['#0b132b', '#1c2541', '#3a506b', '#4a5568'],
  },
  classic: {
    label: 'Classic',
    background: '#ffffff',
    colors: [],
  },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;
