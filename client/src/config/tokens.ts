/**
 * Design tokens — the single JS-side source of truth for brand values that
 * also need to be referenced outside CSS (charts, canvas, particles, OG
 * images). Visual theming lives in CSS variables (see index.css); this file
 * is for values consumed by TypeScript. Project rule #8: one shape everywhere.
 */

export const brand = {
  cyan: '#00ffd1',
  cyanDim: '#0bbfa3',
  violet: '#a855f7',
  pink: '#ec4899',
  blue: '#38bdf8',
} as const;

export const surface = {
  bg: '#0a0a0f',
  soft: '#0f0f17',
  card: '#13131d',
  elevated: '#1a1a24',
  line: '#23232f',
} as const;

export const ink = {
  DEFAULT: '#e7e7ee',
  soft: '#a1a1b5',
  dim: '#6b6b7d',
} as const;

/** Ordered palette for charts / data-viz (analytics dashboards). */
export const chartPalette = [
  brand.cyan,
  brand.violet,
  brand.blue,
  brand.pink,
  brand.cyanDim,
] as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
} as const;

export const zLayer = {
  base: 0,
  content: 10,
  dock: 40,
  header: 50,
  overlay: 60,
  modal: 70,
  toast: 80,
} as const;

export type Brand = typeof brand;
export type ChartColor = (typeof chartPalette)[number];
