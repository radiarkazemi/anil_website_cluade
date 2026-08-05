import { Link, NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { useTheme } from '../store/themeStore';
import { faPrice } from '../utils/format';

export function Header() {
  const goldPrice = useStore((s) => s.goldPrice);
  const cartCount = useStore((s) => s.cartCount());
  const user = useStore((s) => s.user);
  const openCart = useUI((s) => s.openCart);
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const isAdmin = user && (user.role === 'admin' || user.role === 'staff');
  const gp = goldPrice?.price_18k_per_gram ?? 0;

  return (
    <>
      <div style={{
        background: theme === 'dark'
          ? 'linear-gradient(90deg,#0d0b07,#1a1206,#0d0b07)'
          : 'linear-gradient(90deg,#f3e7d3,#fff6e4,#f3e7d3)',
        borderBottom: '1px solid var(--border-gold)', textAlign: 'center',
        padding: '9px 20px', fontSize: 12.5, color: 'var(--gold-deep)',
      }}>
        ✦ ارسال امن و بیمه‌شده به سراسر کشور · ضمانت اصالت و بازخرید · مشاوره‌ی رایگان تخصصی ✦
      </div>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--header-bg)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px var(--px)', gap: 24,
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', border: '1.5px solid var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold-light)', fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: 24,
              background: theme === 'light' ? '#fff' : 'transparent',
            }}>A</div>
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontFamily: 'var(--font-brand)', letterSpacing: 5, color: 'var(--text)', fontSize: 20, fontWeight: 600 }}>ANIL</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>GOLD & JEWELRY</div>
            </div>
          </Link>

          <nav style={{ display: 'flex', gap: 28, color: 'var(--text-muted)', fontSize: 14.5, fontWeight: 500 }}>
            <NavLink to="/" end style={({ isActive }) => ({ color: isActive ? 'var(--gold-light)' : undefined })}>خانه</NavLink>
            <NavLink to="/products" style={({ isActive }) => ({ color: isActive ? 'var(--gold-light)' : undefined })}>محصولات</NavLink>
            {isAdmin && (
              <NavLink to="/panel" style={({ isActive }) => ({ color: isActive ? 'var(--gold-light)' : undefined })}>پنل مدیریت</NavLink>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {gp > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px',
                border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-pill)',
                background: 'rgba(212,175,55,.06)',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: 'var(--up)',
                  boxShadow: '0 0 8px var(--up)', animation: 'twinkle 1.4s infinite',
                }} />
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>طلای ۱۸</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gold-light)' }}>{faPrice(gp)}</span>
              </div>
            )}

            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'} type="button">
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            {user ? (
              <Link to="/panel" style={{
                fontSize: 13, color: 'var(--gold-light)', padding: '8px 12px',
                border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-sm)',
              }}>{user.full_name || 'حساب من'}</Link>
            ) : (
              <Link to="/login" style={{
                fontSize: 13, color: 'var(--gold-light)', padding: '8px 14px',
                border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-sm)',
              }}>ورود</Link>
            )}

            <button onClick={openCart} type="button" style={{
              position: 'relative', width: 38, height: 38, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 15,
              background: 'transparent',
            }}>
              🛍
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, left: -6, background: 'var(--gold)',
                  color: '#1a1206', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18,
                  padding: '0 4px', borderRadius: 'var(--radius-pill)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
