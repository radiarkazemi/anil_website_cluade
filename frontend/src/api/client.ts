import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const tokens = localStorage.getItem('anil_tokens');
  if (tokens) {
    try {
      const { access } = JSON.parse(tokens);
      if (access) config.headers.Authorization = `Bearer ${access}`;
    } catch {}
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      const tokens = localStorage.getItem('anil_tokens');
      if (tokens) {
        try {
          const { refresh } = JSON.parse(tokens);
          const res = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh });
          const newTokens = { access: res.data.access, refresh: res.data.refresh || refresh };
          localStorage.setItem('anil_tokens', JSON.stringify(newTokens));
          orig.headers.Authorization = `Bearer ${newTokens.access}`;
          return client(orig);
        } catch {
          localStorage.removeItem('anil_tokens');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
