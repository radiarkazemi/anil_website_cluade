import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { useTheme } from '../store/themeStore';
import { faNum, faPrice } from '../utils/format';

function IconBag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6.2 8.2h11.6l-.9 10.1a1.8 1.8 0 0 1-1.8 1.5H8.9a1.8 1.8 0 0 1-1.8-1.5L6.2 8.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 8.2V6.8a3 3 0 0 1 6 0v1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4.8 8.2h14.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

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

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

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

            <button
              className="icon-btn cart-btn"
              onClick={() => { closeMenu(); openCart(); }}
              type="button"
              aria-label={cartLabel}
            >
              <span className="cart-label-full">{cartLabel}</span>
              <span className="cart-ico-mobile"><IconBag /></span>
              {cartCount > 0 && <span className="cart-badge">{faNum(cartCount)}</span>}
            </button>

            <button
              type="button"
              className={`nav-toggle ${menuOpen ? 'open' : ''}`}
              aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {gp > 0 && (
          <div className="mobile-ticker">
            <div className="container mobile-ticker-inner">
              <span className="mobile-ticker-live">
                <span className="live-dot" />
                نرخ زنده طلای ۱۸
              </span>
              <strong className="mobile-ticker-price">
                <span className="mobile-ticker-num">{faPrice(gp)}</span>
                <em>تومان / گرم</em>
              </strong>
            </div>
          </div>
        )}
      </header>

      {/* Standard mobile drawer — portal-like fixed overlay outside sticky header */}
      <div
        className={`mobile-drawer ${menuOpen ? 'is-open' : ''}`}
        aria-hidden={!menuOpen}
        {...(!menuOpen ? { inert: true } : {})}
      >
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="بستن منو"
          tabIndex={menuOpen ? 0 : -1}
          onClick={closeMenu}
        />
        <nav
          id="mobile-nav-drawer"
          className="mobile-nav"
          aria-label="منوی موبایل"
          aria-hidden={!menuOpen}
        >
          <div className="mobile-nav-head">
            <Link to="/" className="mobile-nav-brand" onClick={closeMenu}>
              <img src={logoSrc} alt="" className="mobile-nav-logo" />
              <span>
                <strong>{brandName}</strong>
                <em>{brandTag}</em>
              </span>
            </Link>
            <button
              type="button"
              className="mobile-nav-close"
              aria-label="بستن منو"
              onClick={closeMenu}
            >
              ×
            </button>
          </div>
          <div className="mobile-nav-links">{navLinks}</div>
          <div className="mobile-nav-actions">
            {user ? (
              <Link to="/account" className="gold-btn" onClick={closeMenu}>حساب من</Link>
            ) : (
              <Link to="/login" className="gold-btn" onClick={closeMenu}>ورود / ثبت‌نام</Link>
            )}
            <button type="button" className="outline-btn mobile-theme-btn" onClick={() => toggleTheme()}>
              {theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
            </button>
            {!hasAdminSession && (
              <Link to="/panel/login" className="outline-btn" onClick={closeMenu}>پنل مدیریت</Link>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
