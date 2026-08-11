import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
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
    { name: 'anil-theme' }
  )
);

export function initTheme() {
  const saved = localStorage.getItem('anil-theme');
  let theme: Theme = 'dark';
  try {
    if (saved) theme = JSON.parse(saved).state?.theme || 'dark';
  } catch {}
  document.documentElement.setAttribute('data-theme', theme);
}
