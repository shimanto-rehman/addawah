function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export type ChartTheme = {
  accent: string;
  accentRgb: string;
  accentSoft: string;
  accentGlow: string;
  surface: string;
  text: string;
  grid: string;
  success: string;
  warn: string;
  danger: string;
  categorical: string[];
};

const GOLD = '#e8c547';
const GOLD_RGB = '232, 197, 71';

// Stable secondary hues for multi-series categorical charts. The leading slot
// tracks the active theme accent; the rest stay perceptually distinct so series
// remain identifiable across themes.
const CATEGORICAL_SECONDARY = ['#3ecf8e', '#3b9eff', '#9b7bf7', '#f06bab'];

export function chartTheme(): ChartTheme {
  const accent = readVar('--accent-bright', GOLD);
  const accentRgb = parseHex(accent) ?? parseHex(GOLD);
  const rgb = accentRgb ? accentRgb.join(', ') : GOLD_RGB;

  return {
    accent,
    accentRgb: rgb,
    accentSoft: readVar('--accent-soft', `rgba(${GOLD_RGB}, 0.12)`),
    accentGlow: readVar('--accent-glow', `rgba(${GOLD_RGB}, 0.35)`),
    surface: readVar('--surface-2', '#121824'),
    text: readVar('--text-dim', '#8a8070'),
    grid: 'rgba(128, 128, 128, 0.14)',
    success: readVar('--success', '#3ecf8e'),
    warn: '#e8b923',
    danger: readVar('--danger', '#e05252'),
    categorical: [accent, ...CATEGORICAL_SECONDARY],
  };
}

/** Build an rgba() string from the theme accent at a given alpha. */
export function accentRgba(theme: ChartTheme, alpha: number): string {
  return `rgba(${theme.accentRgb}, ${alpha})`;
}
