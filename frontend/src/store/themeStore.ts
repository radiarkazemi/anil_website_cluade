import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

/** Maison Anil — light by default (Tiffany / VCA / Bulgari quiet luxury). */
export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },
    }),
    { name: 'anil-theme-maison' }
  )
);

export function initTheme() {
  const saved = localStorage.getItem('anil-theme-maison');
  let theme: Theme = 'light';
  try {
    if (saved) theme = JSON.parse(saved).state?.theme || 'light';
  } catch {
    /* keep light */
  }
  document.documentElement.setAttribute('data-theme', theme);
}
