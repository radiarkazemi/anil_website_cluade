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
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <span className="logo-mark">A</span>
          <span className="logo-text">
            <span className="logo-name">ANIL</span>
            <span className="logo-sub">GOLD &amp; JEWELRY</span>
          </span>
        </Link>

        <nav className="main-nav">
          <NavLink to="/" end>خانه</NavLink>
          <NavLink to="/products">محصولات</NavLink>
          {isAdmin && <NavLink to="/panel">پنل مدیریت</NavLink>}
        </nav>

        <div className="header-actions">
          {gp > 0 && (
            <div className="live-gold" title="نرخ طلای ۱۸ عیار">
              <span className="live-dot" />
              <span className="live-label">۱۸</span>
              <span className="live-price">{faPrice(gp)}</span>
            </div>
          )}

          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
            type="button"
            aria-label="تغییر تم"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z" />
              </svg>
            )}
          </button>

          {user ? (
            <Link to={isAdmin ? '/panel' : '/'} className="text-btn">
              {user.full_name || 'حساب من'}
            </Link>
          ) : (
            <Link to="/login" className="text-btn">ورود</Link>
          )}

          <button className="icon-btn cart-btn" onClick={openCart} type="button" aria-label="سبد خرید">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6h15l-1.5 9h-12z" />
              <path d="M6 6l-1-3H2" />
              <circle cx="9" cy="20" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
