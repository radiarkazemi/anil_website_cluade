import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    document.body.classList.toggle('nav-open', menuOpen);
    return () => document.body.classList.remove('nav-open');
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const brandName = site?.brand_name || 'Anil';
  const brandTag = site?.brand_tagline || 'درخششی ابدی';
  const cartLabel = site?.cart_label || 'گلد باکس';
  const logoSrc = site?.brand_logo_url || '/logo.png';
  const banner = site?.top_banner;

  const closeMenu = () => setMenuOpen(false);

  const navLinks = (
    <>
      <NavLink to="/" end onClick={closeMenu}>خانه</NavLink>
      <NavLink to="/products" onClick={closeMenu}>محصولات</NavLink>
      {navPages.length > 0 ? (
        navPages.map((p) => {
          const to = p.slug === 'بلاگ'
            ? '/blog'
            : p.page_type === 'blog'
              ? `/blog/${p.slug}`
              : `/p/${p.slug}`;
          const label = p.title === 'بلاگ آنیل' ? 'بلاگ' : p.title;
          return <NavLink key={p.id} to={to} onClick={closeMenu}>{label}</NavLink>;
        })
      ) : (
        <>
          <NavLink to="/p/راهنمای-خرید" onClick={closeMenu}>راهنمای خرید</NavLink>
          <NavLink to="/blog" onClick={closeMenu}>بلاگ</NavLink>
        </>
      )}
      {hasAdminSession && <NavLink to="/panel" onClick={closeMenu}>پنل مدیریت</NavLink>}
    </>
  );

  return (
    <>
      {banner && <div className="top-banner">{banner}</div>}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo" onClick={closeMenu}>
            <img className="logo-img" src={logoSrc} alt={brandName} />
            <span className="logo-text">
              <span className="logo-name">{brandName}</span>
              <span className="logo-sub">{brandTag}</span>
            </span>
          </Link>

          <nav className="main-nav desktop-nav" aria-label="منوی اصلی">
            {navLinks}
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
              className="icon-btn header-theme-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
              type="button"
              aria-label="تغییر تم"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            {user ? (
              <Link to="/account" className="text-btn header-account" onClick={closeMenu}>
                {user.full_name || 'حساب من'}
              </Link>
            ) : (
              <Link to="/login" className="text-btn ghost-border header-account" onClick={closeMenu}>ورود</Link>
            )}

            {!hasAdminSession && (
              <Link to="/panel/login" className="text-btn header-panel" title="ورود مدیران" onClick={closeMenu}>
                پنل
              </Link>
            )}

            <button className="icon-btn cart-btn" onClick={() => { closeMenu(); openCart(); }} type="button" aria-label={cartLabel}>
              <span className="cart-label-full">{cartLabel}</span>
              <span className="cart-label-short" aria-hidden>◈</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>

            <button
              type="button"
              className={`nav-toggle ${menuOpen ? 'open' : ''}`}
              aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {gp > 0 && (
          <a href="/#market" className="mobile-gold-bar" aria-label="نرخ زنده طلای ۱۸ عیار">
            <span className="mobile-gold-bar-live">
              <span className="live-dot" />
              طلای ۱۸ عیار
            </span>
            <strong className="mobile-gold-bar-price">{faPrice(gp)} <span>تومان</span></strong>
          </a>
        )}

        {menuOpen && (
          <>
            <button type="button" className="mobile-nav-backdrop" aria-label="بستن منو" onClick={closeMenu} />
            <nav className="mobile-nav" aria-label="منوی موبایل">
              {navLinks}
              <div className="mobile-nav-actions">
                {user ? (
                  <Link to="/account" className="gold-btn" onClick={closeMenu}>حساب من</Link>
                ) : (
                  <Link to="/login" className="gold-btn" onClick={closeMenu}>ورود / ثبت‌نام</Link>
                )}
                <button
                  type="button"
                  className="outline-btn mobile-theme-btn"
                  onClick={() => { toggleTheme(); }}
                >
                  {theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
                </button>
                {!hasAdminSession && (
                  <Link to="/panel/login" className="outline-btn" onClick={closeMenu}>پنل مدیریت</Link>
                )}
              </div>
            </nav>
          </>
        )}
      </header>
    </>
  );
}
