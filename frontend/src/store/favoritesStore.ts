import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => boolean;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  count: () => number;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      has: (productId) => get().ids.includes(productId),
      toggle: (productId) => {
        const on = get().ids.includes(productId);
        if (on) {
          set((s) => ({ ids: s.ids.filter((id) => id !== productId) }));
          return false;
        }
        set((s) => ({ ids: [...s.ids, productId] }));
        return true;
      },
      add: (productId) =>
        set((s) => (s.ids.includes(productId) ? s : { ids: [...s.ids, productId] })),
      remove: (productId) => set((s) => ({ ids: s.ids.filter((id) => id !== productId) })),
      count: () => get().ids.length,
    }),
    { name: 'anil-favorites' },
  ),
);
