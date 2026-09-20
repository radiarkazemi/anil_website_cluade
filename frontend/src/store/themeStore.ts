import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEMES = ['dark', 'light', 'noir', 'rose'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_META: Record<
  Theme,
  { label: string; swatch: string; hint: string }
> = {
  dark: { label: 'شب طلایی', swatch: '#0a0906', hint: 'تیره کلاسیک' },
  light: { label: 'عاج روشن', swatch: '#f7f2e9', hint: 'روشن گرم' },
  noir: { label: 'نوآر', swatch: '#12151c', hint: 'زغال و شامپاین' },
  rose: { label: 'رزگلد', swatch: '#2a1818', hint: 'رز و طلا' },
};

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

function applyDomTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  cycle: () => void;
  /** @deprecated use setTheme / cycle */
  toggle: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        const next = isTheme(theme) ? theme : 'dark';
        applyDomTheme(next);
        set({ theme: next });
      },
      cycle: () => {
        const cur = get().theme;
        const idx = THEMES.indexOf(cur);
        const next = THEMES[(idx + 1) % THEMES.length];
        applyDomTheme(next);
        set({ theme: next });
      },
      toggle: () => {
        get().cycle();
      },
    }),
    {
      name: 'anil-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.theme && isTheme(state.theme)) {
          applyDomTheme(state.theme);
        }
      },
    }
  )
);

export function initTheme() {
  const saved = localStorage.getItem('anil-theme');
  let theme: Theme = 'dark';
  try {
    if (saved) {
      const parsed = JSON.parse(saved).state?.theme;
      if (isTheme(parsed)) theme = parsed;
    }
  } catch {
    /* ignore */
  }
  applyDomTheme(theme);
}
