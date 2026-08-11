import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

function applyThemeDom(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.add('anil-theme-maison');
}

/** Maison Anil — light by default (Tiffany / VCA / Bulgari / Versace). */
export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyThemeDom(theme);
        set({ theme });
      },
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyThemeDom(next);
        set({ theme: next });
      },
    }),
    { name: 'anil-theme-maison-v2' }
  )
);

export function initTheme() {
  const saved =
    localStorage.getItem('anil-theme-maison-v2') ||
    localStorage.getItem('anil-theme-maison');
  let theme: Theme = 'light';
  try {
    if (saved) theme = JSON.parse(saved).state?.theme || 'light';
  } catch {
    /* keep light */
  }
  applyThemeDom(theme);
}
