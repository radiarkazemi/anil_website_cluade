import axios, { type InternalAxiosRequestConfig } from 'axios';
import { ADMIN_TOKEN_KEY, CLIENT_TOKEN_KEY, setSessionTokens } from '../store/useStore';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api/v1' : '/api/v1');

export type AuthSession = 'client' | 'admin';

declare module 'axios' {
  export interface AxiosRequestConfig {
    authSession?: AuthSession;
  }
}

function resolveSession(config: InternalAxiosRequestConfig): AuthSession {
  if (config.authSession) return config.authSession;
  const url = `${config.baseURL || ''}${config.url || ''}`;
  if (url.includes('/admin/') || url.includes('/auth/admin/')) return 'admin';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/panel')) {
    return 'admin';
  }
  return 'client';
}

function readTokens(session: AuthSession) {
  const key = session === 'admin' ? ADMIN_TOKEN_KEY : CLIENT_TOKEN_KEY;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { access: string; refresh: string }) : null;
  } catch {
    return null;
  }
}

/** Single in-flight refresh per session — prevents rotate/blacklist races. */
const refreshPromises: Partial<Record<AuthSession, Promise<{ access: string; refresh: string } | null>>> = {};

async function refreshSession(session: AuthSession): Promise<{ access: string; refresh: string } | null> {
  if (refreshPromises[session]) return refreshPromises[session]!;

  refreshPromises[session] = (async () => {
    const tokens = readTokens(session);
    if (!tokens?.refresh) return null;
    try {
      const res = await axios.post(`${API_BASE}/auth/token/refresh/`, {
        refresh: tokens.refresh,
      });
      const newTokens = {
        access: res.data.access as string,
        refresh: (res.data.refresh as string) || tokens.refresh,
      };
      setSessionTokens(session, newTokens);
      return newTokens;
    } catch (err: any) {
      const status = err?.response?.status;
      // Only hard-logout on definitive auth rejection (not network / throttle)
      if (status === 401 || status === 403) {
        setSessionTokens(session, null);
      }
      return null;
    } finally {
      delete refreshPromises[session];
    }
  })();

  return refreshPromises[session]!;
}

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const session = resolveSession(config);
  (config as InternalAxiosRequestConfig & { authSession?: AuthSession }).authSession = session;
  const tokens = readTokens(session);
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Content-Type', undefined as unknown as string);
    }
    delete (config.headers as Record<string, unknown>)['Content-Type'];
    delete (config.headers as Record<string, unknown>)['content-type'];
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      authSession?: AuthSession;
    };
    if (error.response?.status === 401 && orig && !orig._retry) {
      orig._retry = true;
      const session = orig.authSession || resolveSession(orig);
      const refreshed = await refreshSession(session);
      if (refreshed?.access) {
        orig.headers = orig.headers || {};
        orig.headers.Authorization = `Bearer ${refreshed.access}`;
        return client(orig);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
