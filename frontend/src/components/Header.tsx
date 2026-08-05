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
      <div className="top-banner">
        ارسال امن و بیمه‌شده به سراسر کشور · ضمانت اصالت و بازخرید · مشاوره‌ی رایگان تخصصی
      </div>
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
                <span className="live-label">طلای ۱۸</span>
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
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            {user ? (
              <Link to={isAdmin ? '/panel' : '/'} className="text-btn">
                {user.full_name || 'حساب من'}
              </Link>
            ) : (
              <Link to="/login" className="text-btn ghost-border">ورود</Link>
            )}

            <button className="icon-btn cart-btn" onClick={openCart} type="button" aria-label="سبد خرید">
              سبد
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
