/**
 * Color palettes. Each one comes with the background it was designed for; every
 * color has at least 3:1 contrast against it (the WCAG bar for large text).
 */
export interface Palette {
  label: string;
  background: string;
  /** Empty means random HSB colors, as in the original Java version. */
  colors: string[];
  /**
   * For marking shared words by warmth: words several documents share take a
   * warm color, words only one uses a cool one. Empty (with `colors`) means
   * random HSB colors in warm and cool hue ranges.
   */
  warm: string[];
  cool: string[];
}

export const PALETTES = {
  storm: {
    label: 'Storm',
    background: '#ffffff',
    colors: ['#1d3557', '#2a6f97', '#d62839', '#e07a1f', '#1b8a7a', '#6d597a', '#b5485d', '#264653', '#8a5a00'],
    warm: ['#d62839', '#e07a1f', '#b5485d', '#c2185b', '#8a5a00'],
    cool: ['#1d3557', '#2a6f97', '#1b8a7a', '#264653', '#6d597a'],
  },
  ocean: {
    label: 'Ocean',
    background: '#f6fafb',
    colors: ['#03045e', '#023e8a', '#0369a1', '#00789e', '#0b525b', '#006466', '#1e6091'],
    // Coral accents, since the palette itself has no warm colors.
    warm: ['#c2410c', '#d1495b', '#b5485d'],
    cool: ['#03045e', '#023e8a', '#0369a1', '#00789e', '#0b525b', '#006466', '#1e6091'],
  },
  sunset: {
    label: 'Sunset',
    background: '#fff9f4',
    colors: ['#7b2cbf', '#c9184a', '#e0294f', '#c2410c', '#b91c1c', '#9d0208', '#a4133c'],
    warm: ['#c9184a', '#e0294f', '#c2410c', '#b91c1c', '#9d0208', '#a4133c'],
    cool: ['#7b2cbf', '#5a189a', '#3c096c', '#4c3a8c'],
  },
  forest: {
    label: 'Forest',
    background: '#fbfaf5',
    colors: ['#283618', '#4f5d2f', '#a0522d', '#8a6d1d', '#344e41', '#3f6b3a', '#6b4423'],
    warm: ['#a0522d', '#8a6d1d', '#6b4423', '#b4541a'],
    cool: ['#283618', '#4f5d2f', '#344e41', '#3f6b3a', '#2f5d62'],
  },
  midnight: {
    label: 'Midnight',
    background: '#0f172a',
    colors: ['#f8fafc', '#7dd3fc', '#fda4af', '#fde68a', '#86efac', '#c4b5fd', '#fdba74'],
    warm: ['#fda4af', '#fde68a', '#fdba74', '#f9a8d4'],
    cool: ['#7dd3fc', '#86efac', '#c4b5fd', '#f8fafc'],
  },
  ink: {
    label: 'Ink',
    background: '#ffffff',
    colors: ['#0b132b', '#1c2541', '#3a506b', '#4a5568'],
    // Red-ink accents for shared words.
    warm: ['#9b2335', '#a8461b'],
    cool: ['#0b132b', '#1c2541', '#3a506b', '#4a5568'],
  },
  classic: {
    label: 'Classic',
    background: '#ffffff',
    colors: [],
    warm: [],
    cool: [],
  },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;
