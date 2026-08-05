import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, GoldPrice, User } from '../types';

interface AppState {
  goldPrice: GoldPrice | null;
  setGoldPrice: (gp: GoldPrice) => void;

  cart: CartItem[];
  addToCart: (productId: string, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartCount: () => number;

  user: User | null;
  setUser: (u: User | null) => void;
  tokens: { access: string; refresh: string } | null;
  setTokens: (t: { access: string; refresh: string } | null) => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      goldPrice: null,
      setGoldPrice: (gp) => set({ goldPrice: gp }),

      cart: [],
      addToCart: (productId, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((c) => c.productId === productId);
          if (existing) {
            return { cart: s.cart.map((c) => (c.productId === productId ? { ...c, qty: c.qty + qty } : c)) };
          }
          return { cart: [...s.cart, { productId, qty }] };
        }),
      removeFromCart: (productId) => set((s) => ({ cart: s.cart.filter((c) => c.productId !== productId) })),
      updateQty: (productId, qty) =>
        set((s) => {
          if (qty <= 0) return { cart: s.cart.filter((c) => c.productId !== productId) };
          return { cart: s.cart.map((c) => (c.productId === productId ? { ...c, qty } : c)) };
        }),
      clearCart: () => set({ cart: [] }),
      cartCount: () => get().cart.reduce((s, c) => s + c.qty, 0),

      user: null,
      setUser: (u) => set({ user: u }),
      tokens: null,
      setTokens: (t) => {
        set({ tokens: t });
        if (t) localStorage.setItem('anil_tokens', JSON.stringify(t));
        else localStorage.removeItem('anil_tokens');
      },
      logout: () => set({ user: null, tokens: null }),
    }),
    {
      name: 'anil-store',
      partialize: (s) => ({ cart: s.cart, tokens: s.tokens }),
    }
  )
);
