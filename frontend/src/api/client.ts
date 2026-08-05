import axios, { type InternalAxiosRequestConfig } from 'axios';
import { ADMIN_TOKEN_KEY, CLIENT_TOKEN_KEY, setSessionTokens } from '../store/useStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

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
      const tokens = readTokens(session);
      if (tokens?.refresh) {
        try {
          const res = await axios.post(`${API_BASE}/auth/token/refresh/`, {
            refresh: tokens.refresh,
          });
          const newTokens = {
            access: res.data.access,
            refresh: res.data.refresh || tokens.refresh,
          };
          setSessionTokens(session, newTokens);
          orig.headers = orig.headers || {};
          orig.headers.Authorization = `Bearer ${newTokens.access}`;
          return client(orig);
        } catch {
          setSessionTokens(session, null);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
