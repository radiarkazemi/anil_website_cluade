import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../store/themeStore';
import type { User } from '../../types';

const NAV = [
  { to: '/panel', end: true, label: 'داشبورد', icon: '◈' },
  { to: '/panel/products', label: 'محصولات', icon: '◆' },
  { to: '/panel/categories', label: 'دسته‌بندی‌ها', icon: '▣' },
  { to: '/panel/orders', label: 'سفارش‌ها', icon: '☰' },
  { to: '/panel/gold', label: 'نرخ طلا', icon: '◉' },
  { to: '/panel/users', label: 'کاربران', icon: '☺' },
];

export function AdminLayout() {
  const tokens = useStore((s) => s.tokens);
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const logout = useStore((s) => s.logout);
  const setTokens = useStore((s) => s.setTokens);
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    if (!tokens) return;
    if (user) { setLoading(false); return; }
    api.profile().then((r) => { setUser(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [tokens, user, setUser]);

  if (!tokens) return <Navigate to="/login" replace />;
  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>در حال بارگذاری پنل…</div>;

  const u = user as User | null;
  const allowed = u && (u.role === 'admin' || u.role === 'staff');
  if (!allowed) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>دسترسی محدود</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>این بخش فقط برای مدیران فروشگاه است.</p>
        <a href="/" className="gold-btn">بازگشت به فروشگاه</a>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, padding: '0 8px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-brand)', fontWeight: 700, color: 'var(--gold-light)', fontSize: 20,
          }}>A</div>
          <div>
            <div style={{ fontFamily: 'var(--font-brand)', letterSpacing: 3, fontWeight: 600 }}>ANIL</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>پنل مدیریت پیشرفته</div>
          </div>
        </div>

        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}>
            <span>{n.icon}</span> {n.label}
          </NavLink>
        ))}

        <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="admin-nav-item" type="button" onClick={toggleTheme} style={{ width: '100%', background: 'transparent' }}>
            {theme === 'dark' ? '☀ حالت روشن' : '☾ حالت تاریک'}
          </button>
          <a href="/" className="admin-nav-item">← بازگشت به فروشگاه</a>
          <button
            className="admin-nav-item"
            type="button"
            style={{ width: '100%', background: 'transparent', color: 'var(--down)' }}
            onClick={() => { if (tokens?.refresh) api.logout(tokens.refresh).catch(() => {}); logout(); setTokens(null); }}
          >
            خروج
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
