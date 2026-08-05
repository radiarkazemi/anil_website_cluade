import { Link, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { useTheme } from '../store/themeStore';
import { faPrice } from '../utils/format';

export function Header() {
  const goldPrice = useStore((s) => s.goldPrice);
  const cartCount = useStore((s) => s.cartCount());
  const user = useStore((s) => s.user);
  const adminUser = useStore((s) => s.adminUser);
  const adminTokens = useStore((s) => s.adminTokens);
  const openCart = useUI((s) => s.openCart);
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const hasAdminSession =
    !!adminTokens && !!adminUser && (adminUser.role === 'admin' || adminUser.role === 'staff');
  const gp = goldPrice?.price_18k_per_gram ?? 0;

  const { data: site } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.siteSettings().then((r) => r.data),
    staleTime: 60_000,
  });
  const { data: navPages = [] } = useQuery({
    queryKey: ['nav-pages'],
    queryFn: () => api.pages({ nav: '1' }).then((r) => r.data),
    staleTime: 60_000,
  });

  const brandName = site?.brand_name || 'Anil';
  const brandTag = site?.brand_tagline || 'درخششی ابدی';
  const cartLabel = site?.cart_label || 'گلد باکس';
  const logoSrc = site?.brand_logo_url || '/logo.png';
  const banner = site?.top_banner;

  return (
    <>
      {banner && <div className="top-banner">{banner}</div>}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            <img className="logo-img" src={logoSrc} alt={brandName} />
            <span className="logo-text">
              <span className="logo-name">{brandName}</span>
              <span className="logo-sub">{brandTag}</span>
            </span>
          </Link>

          <nav className="main-nav">
            <NavLink to="/" end>خانه</NavLink>
            <NavLink to="/products">محصولات</NavLink>
            {navPages.length > 0 ? (
              navPages.map((p) => {
                const to = p.slug === 'بلاگ'
                  ? '/blog'
                  : p.page_type === 'blog'
                    ? `/blog/${p.slug}`
                    : `/p/${p.slug}`;
                const label = p.title === 'بلاگ آنیل' ? 'بلاگ' : p.title;
                return <NavLink key={p.id} to={to}>{label}</NavLink>;
              })
            ) : (
              <>
                <NavLink to="/p/راهنمای-خرید">راهنمای خرید</NavLink>
                <NavLink to="/blog">بلاگ</NavLink>
              </>
            )}
            {hasAdminSession && <NavLink to="/panel">پنل مدیریت</NavLink>}
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
              <Link to="/account" className="text-btn">
                {user.full_name || 'حساب من'}
              </Link>
            ) : (
              <Link to="/login" className="text-btn ghost-border">ورود</Link>
            )}

            {!hasAdminSession && (
              <Link to="/panel/login" className="text-btn" title="ورود مدیران">
                پنل
              </Link>
            )}

            <button className="icon-btn cart-btn" onClick={openCart} type="button" aria-label={cartLabel}>
              {cartLabel}
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
