import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../store/themeStore';
import { faNum, faPrice } from '../../utils/format';
import type { User } from '../../types';

const NAV = [
  { to: '/panel', end: true, label: 'داشبورد', icon: '◈', group: 'اصلی' },
  { to: '/panel/orders', label: 'سفارش‌ها', icon: '☰', group: 'فروش', badgeKey: 'orders_pending' as const },
  { to: '/panel/products', label: 'محصولات', icon: '◆', group: 'فروش' },
  { to: '/panel/categories', label: 'دسته‌بندی‌ها', icon: '▣', group: 'فروش' },
  { to: '/panel/gold', label: 'نرخ طلا', icon: '◉', group: 'بازار' },
  { to: '/panel/analytics', label: 'تحلیل و گزارش', icon: '◫', group: 'بازار' },
  { to: '/panel/users', label: 'کاربران', icon: '☺', group: 'سیستم' },
  { to: '/panel/settings', label: 'تنظیمات', icon: '⚙', group: 'سیستم' },
];

const COMMANDS = [
  { label: 'داشبورد', path: '/panel', keywords: 'dashboard home' },
  { label: 'سفارش‌ها', path: '/panel/orders', keywords: 'orders فروش' },
  { label: 'محصولات', path: '/panel/products', keywords: 'products کالا' },
  { label: 'دسته‌بندی‌ها', path: '/panel/categories', keywords: 'categories' },
  { label: 'نرخ طلا', path: '/panel/gold', keywords: 'gold قیمت' },
  { label: 'تحلیل و گزارش', path: '/panel/analytics', keywords: 'analytics report' },
  { label: 'کاربران', path: '/panel/users', keywords: 'users' },
  { label: 'تنظیمات', path: '/panel/settings', keywords: 'settings' },
  { label: 'فروشگاه', path: '/', keywords: 'shop storefront' },
];

export function AdminLayout() {
  const tokens = useStore((s) => s.adminTokens);
  const user = useStore((s) => s.adminUser);
  const setUser = useStore((s) => s.setAdminUser);
  const logout = useStore((s) => s.adminLogout);
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const [loading, setLoading] = useState(!user);
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQ, setCmdQ] = useState('');
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { data: dash } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.adminDashboard().then((r) => r.data),
    enabled: !!tokens,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!tokens) return;
    if (user) { setLoading(false); return; }
    api.profile('admin').then((r) => { setUser(r.data); setLoading(false); }).catch(() => {
      logout();
      setLoading(false);
    });
  }, [tokens, user, setUser, logout]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredCmds = useMemo(() => {
    const q = cmdQ.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) =>
      `${c.label} ${c.keywords} ${c.path}`.toLowerCase().includes(q),
    );
  }, [cmdQ]);

  const pageTitle = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label || 'پنل';

  if (!tokens) return <Navigate to="/panel/login" replace />;
  if (loading) {
    return <div className="admin-boot">در حال بارگذاری پنل پیشرفته…</div>;
  }

  const u = user as User | null;
  const allowed = u && (u.role === 'admin' || u.role === 'staff');
  if (!allowed) {
    return (
      <div className="admin-boot">
        <h2 style={{ marginBottom: 12 }}>دسترسی محدود</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>این بخش فقط برای مدیران فروشگاه است.</p>
        <button
          type="button"
          className="gold-btn"
          onClick={() => { logout(); navigate('/panel/login'); }}
        >
          ورود با حساب مدیر
        </button>
      </div>
    );
  }

  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <div className={`admin-shell advanced ${collapsed ? 'collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="logo-mark">A</div>
          {!collapsed && (
            <div>
              <div className="admin-brand-name">ANIL OPS</div>
              <div className="admin-brand-sub">کنترل‌پنل حرفه‌ای</div>
            </div>
          )}
        </div>

        {groups.map((g) => (
          <div key={g} className="admin-nav-group">
            {!collapsed && <div className="admin-nav-group-label">{g}</div>}
            {NAV.filter((n) => n.group === g).map((n) => {
              const badge = n.badgeKey && dash ? Number((dash as any)[n.badgeKey] || 0) : 0;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
                  title={n.label}
                >
                  <span className="admin-nav-icon">{n.icon}</span>
                  {!collapsed && <span className="admin-nav-label">{n.label}</span>}
                  {!collapsed && badge > 0 && <span className="admin-nav-badge">{faNum(badge)}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}

        <div className="admin-sidebar-foot">
          <button type="button" className="admin-nav-item" onClick={() => setCollapsed((c) => !c)}>
            <span className="admin-nav-icon">{collapsed ? '»' : '«'}</span>
            {!collapsed && <span>جمع‌کردن منو</span>}
          </button>
          <button type="button" className="admin-nav-item" onClick={toggleTheme}>
            <span className="admin-nav-icon">{theme === 'dark' ? '☀' : '☾'}</span>
            {!collapsed && <span>{theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}</span>}
          </button>
          <a href="/" className="admin-nav-item">
            <span className="admin-nav-icon">←</span>
            {!collapsed && <span>فروشگاه</span>}
          </a>
          <button
            type="button"
            className="admin-nav-item danger"
            onClick={() => {
              if (tokens?.refresh) api.logout(tokens.refresh, 'admin').catch(() => {});
              logout();
              navigate('/panel/login', { replace: true });
            }}
          >
            <span className="admin-nav-icon">⎋</span>
            {!collapsed && <span>خروج از پنل</span>}
          </button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <div className="admin-crumb">پنل / {pageTitle}</div>
            <div className="admin-top-title">{pageTitle}</div>
          </div>
          <div className="admin-top-actions">
            <button type="button" className="admin-cmd-btn" onClick={() => setCmdOpen(true)}>
              جستجوی سریع
              <kbd>Ctrl K</kbd>
            </button>
            {dash && (
              <div className="admin-live-pill">
                <span className="live-dot" />
                ۱۸: {faPrice(dash.gold_price_18k)}
              </div>
            )}
            <div className="admin-user-chip">
              <strong>{u?.full_name || 'مدیر'}</strong>
              <span>{u?.role === 'admin' ? 'مدیر کل' : 'کارمند'}</span>
            </div>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>

      {cmdOpen && (
        <div className="cmd-overlay" onClick={() => setCmdOpen(false)}>
          <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              className="cmd-input"
              placeholder="برو به صفحه، سفارش، محصول…"
              value={cmdQ}
              onChange={(e) => setCmdQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredCmds[0]) {
                  navigate(filteredCmds[0].path);
                  setCmdOpen(false);
                  setCmdQ('');
                }
              }}
            />
            <div className="cmd-list">
              {filteredCmds.map((c) => (
                <button
                  key={c.path}
                  type="button"
                  className="cmd-item"
                  onClick={() => {
                    navigate(c.path);
                    setCmdOpen(false);
                    setCmdQ('');
                  }}
                >
                  <span>{c.label}</span>
                  <code>{c.path}</code>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
