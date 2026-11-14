import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePersistentState } from '../lib/usePersistentState';

// Look-and-feel preferences. Stored unencrypted because the sign-in screen needs them before the vault opens;
// nothing personal lives here.

export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Prefs {
  theme: ThemeChoice;
  accent: string; // hex
  textSize: 'sm' | 'md' | 'lg';
  bubbles: 'round' | 'soft' | 'square';
  density: 'comfy' | 'compact';
  clock: '24h' | '12h';
  enterToSend: boolean;
  autoLock: 0 | 1 | 5 | 15 | 60; // minutes, 0 = never
  server: string; // relay WebSocket URL; empty = default
  /** Bumped when the default look changes, so people who never picked an accent get the new default. */
  accentV: number;
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  accent: '#AEBBEA',
  textSize: 'md',
  bubbles: 'round',
  density: 'comfy',
  clock: '24h',
  enterToSend: true,
  autoLock: 15,
  server: '',
  accentV: 4,
};

/** Hand-tuned pastel accents: the fill, the dark ink that sits on it, and the colour used as text. */
export const ACCENT_PRESETS = [
  { id: 'periwinkle', hex: '#AEBBEA', ink: '#1F2757', text: '#3B4A9B' },
  { id: 'peach', hex: '#F6BFA8', ink: '#4A2412', text: '#9A4A2A' },
  { id: 'mint', hex: '#A8D5C0', ink: '#14382A', text: '#2F7058' },
  { id: 'lilac', hex: '#D9B8E6', ink: '#3A1F4A', text: '#7A4A92' },
  { id: 'sand', hex: '#E6CE8E', ink: '#3F3210', text: '#8A6A14' },
] as const;

const SURFACE = '#FBFBFE'; // the card colour text has to stay readable on
const SURFACE_DARK = '#1A1D2B'; // …and its night counterpart

function parseHex(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb: number[]) => '#' + rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

/** Blend `hex` toward `toward`; t = 0 → hex, t = 1 → toward. */
export function mix(hex: string, t: number, toward = '#000000'): string {
  const a = parseHex(hex);
  const b = parseHex(toward);
  return toHex(a.map((c, i) => c + (b[i] - c) * t));
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const preset = (hex: string) => ACCENT_PRESETS.find((p) => p.hex.toLowerCase() === hex.toLowerCase());

/** A usable accent: valid hex, upper-cased with a leading #. Pastels are welcome, so nothing is darkened. */
export function normalizeAccent(hex: string): string {
  if (!/^#?[0-9a-f]{6}$/i.test(hex)) return DEFAULT_PREFS.accent;
  return (hex.startsWith('#') ? hex : `#${hex}`).toUpperCase();
}

/** Text on top of the accent: a deep shade of the accent itself (white if the accent is dark). */
export function inkOn(accent: string): string {
  const known = preset(accent);
  if (known) return known.ink;
  if (luminance(accent) < 0.2) return '#FFFFFF';
  return mix(accent, 0.8, '#0D1030');
}

/** The accent as *text* on the surface: darkened (day) or lightened (night) until it passes 4.5:1. */
export function textAccent(accent: string, dark = false): string {
  if (dark) {
    let out = accent;
    for (let i = 0; i < 14 && contrast(out, SURFACE_DARK) < 6; i++) out = mix(out, 0.1, '#ffffff');
    return mix(out, 0.22, '#ffffff');
  }
  const known = preset(accent);
  if (known) return known.text;
  let out = accent;
  for (let i = 0; i < 20 && contrast(out, SURFACE) < 4.8; i++) out = mix(out, 0.1, '#14173A');
  return out;
}

/** The accent as a *fill* at night: dark brand colours are lifted until buttons and bubbles stand out. */
export function nightAccent(accent: string): string {
  let out = accent;
  for (let i = 0; i < 14 && contrast(out, SURFACE_DARK) < 3.2; i++) out = mix(out, 0.1, '#ffffff');
  return out;
}

/** Outgoing bubble colour: a washed-out accent by day, a deep accent-tinted indigo by night. */
export function bubbleOut(accent: string, dark: boolean): string {
  if (accent.toLowerCase() === DEFAULT_PREFS.accent.toLowerCase()) return dark ? '#3A4378' : '#D6DCF5';
  return dark ? mix(accent, 0.7, '#12142A') : mix(accent, 0.52, '#FBFBFE');
}

export type ResolvedTheme = 'light' | 'dark';

const SCALE = { sm: 0.93, md: 1, lg: 1.12 };
const RADIUS = { round: [22, 8], soft: [16, 5], square: [8, 2] };

interface PrefsValue {
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  /** What is actually showing: 'system' resolved against the OS setting. */
  theme: ResolvedTheme;
}

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistentState<Partial<Prefs>>('prefs', DEFAULT_PREFS);
  const prefs = useMemo<Prefs>(() => {
    const merged = { ...DEFAULT_PREFS, ...stored };
    // Saved before the redesign: the old pastel accents don't suit the new look, so start from the new default.
    if ((stored.accentV ?? 0) < DEFAULT_PREFS.accentV) merged.accent = DEFAULT_PREFS.accent;
    merged.accentV = DEFAULT_PREFS.accentV;
    return merged;
  }, [stored]);

  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const theme: ResolvedTheme = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme;

  const setPrefs = useCallback((patch: Partial<Prefs>) => setStored({ ...prefs, ...patch }), [prefs, setStored]);

  useEffect(() => {
    const root = document.documentElement;
    const dark = theme === 'dark';
    const base = normalizeAccent(prefs.accent);
    const accent = dark ? nightAccent(base) : base;
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#11131E' : '#ECEEF7');
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-ink', inkOn(accent));
    root.style.setProperty('--accent-text', textAccent(accent, dark));
    root.style.setProperty('--accent-2', dark ? '#F0B7A0' : '#F6BFA8');
    root.style.setProperty('--accent-soft', dark ? mix(accent, 0.8, SURFACE_DARK) : mix(accent, 0.72, SURFACE));
    root.style.setProperty('--bubble-out', bubbleOut(base, dark));
    root.style.setProperty('--text-scale', String(SCALE[prefs.textSize]));
    root.style.setProperty('--bubble-r', `${RADIUS[prefs.bubbles][0]}px`);
    root.style.setProperty('--bubble-tail', `${RADIUS[prefs.bubbles][1]}px`);
    root.dataset.density = prefs.density;
  }, [prefs, theme]);

  const value = useMemo(() => ({ prefs, setPrefs, theme }), [prefs, setPrefs, theme]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}
