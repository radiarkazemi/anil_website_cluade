import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, GoldPrice, User } from '../types';

export type AuthTokens = { access: string; refresh: string };

const CLIENT_TOKEN_KEY = 'anil_client_tokens';
const ADMIN_TOKEN_KEY = 'anil_admin_tokens';

function readTokens(key: string): AuthTokens | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(key: string, t: AuthTokens | null) {
  if (t) localStorage.setItem(key, JSON.stringify(t));
  else localStorage.removeItem(key);
}

// Migrate legacy single-token key once
function migrateLegacyTokens() {
  const legacy = localStorage.getItem('anil_tokens');
  if (!legacy) return;
  if (!localStorage.getItem(CLIENT_TOKEN_KEY) && !localStorage.getItem(ADMIN_TOKEN_KEY)) {
    localStorage.setItem(CLIENT_TOKEN_KEY, legacy);
  }
  localStorage.removeItem('anil_tokens');
}

if (typeof window !== 'undefined') migrateLegacyTokens();

interface AppState {
  goldPrice: GoldPrice | null;
  setGoldPrice: (gp: GoldPrice) => void;

  cart: CartItem[];
  addToCart: (productId: string, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartCount: () => number;

  /** Storefront customer session */
  user: User | null;
  setUser: (u: User | null) => void;
  tokens: AuthTokens | null;
  setTokens: (t: AuthTokens | null) => void;
  logout: () => void;

  /** Ops panel session (independent from customer) */
  adminUser: User | null;
  setAdminUser: (u: User | null) => void;
  adminTokens: AuthTokens | null;
  setAdminTokens: (t: AuthTokens | null) => void;
  adminLogout: () => void;
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
      tokens: readTokens(CLIENT_TOKEN_KEY),
      setTokens: (t) => {
        writeTokens(CLIENT_TOKEN_KEY, t);
        set({ tokens: t });
      },
      logout: () => {
        writeTokens(CLIENT_TOKEN_KEY, null);
        set({ user: null, tokens: null });
      },

      adminUser: null,
      setAdminUser: (u) => set({ adminUser: u }),
      adminTokens: readTokens(ADMIN_TOKEN_KEY),
      setAdminTokens: (t) => {
        writeTokens(ADMIN_TOKEN_KEY, t);
        set({ adminTokens: t });
      },
      adminLogout: () => {
        writeTokens(ADMIN_TOKEN_KEY, null);
        set({ adminUser: null, adminTokens: null });
      },
    }),
    {
      name: 'anil-store',
      partialize: (s) => ({
        cart: s.cart,
        tokens: s.tokens,
        adminTokens: s.adminTokens,
      }),
    }
  )
);

export function getSessionTokens(session: 'client' | 'admin'): AuthTokens | null {
  return session === 'admin' ? readTokens(ADMIN_TOKEN_KEY) : readTokens(CLIENT_TOKEN_KEY);
}

export function setSessionTokens(session: 'client' | 'admin', t: AuthTokens | null) {
  if (session === 'admin') {
    writeTokens(ADMIN_TOKEN_KEY, t);
    useStore.getState().setAdminTokens(t);
  } else {
    writeTokens(CLIENT_TOKEN_KEY, t);
    useStore.getState().setTokens(t);
  }
}

export { CLIENT_TOKEN_KEY, ADMIN_TOKEN_KEY };
