import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { THEME_META, useTheme } from '../store/themeStore';
import { faNum, faPrice } from '../utils/format';
import { IconGoldBox } from './icons';
import { SiteSearch } from './SiteSearch';
import { ThemePicker } from './ThemePicker';
import type { Category } from '../types';

function pageHref(p: { slug: string; page_type: string; title: string }) {
  if (p.slug === 'بلاگ') return '/blog';
  if (p.page_type === 'blog') return `/blog/${p.slug}`;
  return `/p/${p.slug}`;
}

function pageLabel(p: { title: string }) {
  return p.title === 'بلاگ آنیل' ? 'بلاگ' : p.title;
}

export function Header() {
  const goldPrice = useStore((s) => s.goldPrice);
  const cartCount = useStore((s) => s.cartCount());
  const user = useStore((s) => s.user);
  const openCart = useUI((s) => s.openCart);
  const theme = useTheme((s) => s.theme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const productsMenuId = useId();
  const location = useLocation();
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
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories().then((r) => r.data),
    staleTime: 120_000,
  });

  useEffect(() => {
    document.body.classList.toggle('nav-open', menuOpen);
    return () => document.body.classList.remove('nav-open');
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 980) {
        setMenuOpen(false);
        setMobileProductsOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setProductsOpen(false);
    setMobileProductsOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!productsOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProductsOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [productsOpen, menuOpen]);

  useEffect(() => {
    if (!productsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!productsRef.current?.contains(e.target as Node)) setProductsOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [productsOpen]);

  const brandName = site?.brand_name || 'Anil';
  const brandTag = site?.brand_tagline || 'درخششی ابدی';
  const cartLabel = site?.cart_label || 'گلد باکس';
  const logoSrc = site?.brand_logo_url || '/logo.png';
  const banner = site?.top_banner;
  const closeMenu = () => setMenuOpen(false);

  const secondaryNav = navPages.length > 0
    ? navPages.map((p) => ({
        key: p.id,
        to: pageHref(p),
        label: pageLabel(p),
      }))
    : [
        { key: 'guide', to: '/p/راهنمای-خرید', label: 'راهنمای خرید' },
        { key: 'blog', to: '/blog', label: 'بلاگ' },
      ];

  const catList = (categories as Category[]).slice(0, 8);

  const productsPanel = (
    <div className="nav-mega-panel" role="menu" id={productsMenuId}>
      <div className="nav-mega-grid">
        <div className="nav-mega-col">
          <p className="nav-mega-heading">دسته‌بندی‌ها</p>
          <ul className="nav-mega-list">
            <li>
              <Link to="/products" role="menuitem" onClick={closeMenu}>همه‌ی محصولات</Link>
            </li>
            {catList.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/products?category=${encodeURIComponent(c.slug)}`}
                  role="menuitem"
                  onClick={closeMenu}
                >
                  {c.name}
                  {c.product_count > 0 && (
                    <em>{faNum(c.product_count)}</em>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="nav-mega-col nav-mega-featured">
          <p className="nav-mega-heading">کشف کنید</p>
          <Link to="/atelier" className="nav-mega-card" onClick={closeMenu}>
            <span className="nav-mega-card-kicker">آتلیه آنیل</span>
            <strong>از کارگاه تا درخشش</strong>
            <em>داستان ساخت، سفارش اختصاصی و انتخاب هوشمند طلا</em>
          </Link>
          <Link to="/products?sort=-weight_g" className="nav-mega-card soft" onClick={closeMenu}>
            <span className="nav-mega-card-kicker">پیشنهاد روز</span>
            <strong>قطعات سنگین‌تر</strong>
            <em>مناسب سرمایه‌گذاری و هدیه ماندگار</em>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {banner && <div className="top-banner">{banner}</div>}
      <header className="site-header">
        <div className="header-atmosphere" aria-hidden />
        <div className="container header-shell">
          <div className="header-inner">
            <Link to="/" className="logo" onClick={closeMenu}>
              <span className="logo-frame">
                <img className="logo-img" src={logoSrc} alt={brandName} />
              </span>
              <span className="logo-text">
                <span className="logo-name">{brandName}</span>
                <span className="logo-sub">{brandTag}</span>
              </span>
            </Link>

            <nav className="main-nav desktop-nav" aria-label="منوی اصلی">
              <NavLink to="/" end>خانه</NavLink>

              <div
                className={`nav-item-dropdown${productsOpen ? ' is-open' : ''}`}
                ref={productsRef}
                onMouseEnter={() => setProductsOpen(true)}
                onMouseLeave={() => setProductsOpen(false)}
              >
                <button
                  type="button"
                  className={`nav-drop-trigger${location.pathname.startsWith('/products') ? ' active' : ''}`}
                  aria-expanded={productsOpen}
                  aria-haspopup="true"
                  aria-controls={productsMenuId}
                  onClick={() => setProductsOpen((v) => !v)}
                >
                  محصولات
                  <span className="nav-drop-chev" aria-hidden />
                </button>
                {productsOpen && productsPanel}
              </div>

              <NavLink to="/atelier">آتلیه</NavLink>

              {secondaryNav.map((item) => (
                <NavLink key={item.key} to={item.to}>{item.label}</NavLink>
              ))}
            </nav>

            <div className="header-tools">
              <div className="header-search-inline">
                <SiteSearch className="header-search compact" />
              </div>

              {gp > 0 && (
                <div className="live-gold" title="نرخ طلای ۱۸ عیار">
                  <span className="live-dot" />
                  <span className="live-label">طلای ۱۸</span>
                  <span className="live-price">{faPrice(gp)}</span>
                </div>
              )}

              <ThemePicker />

              {user ? (
                <Link to="/account" className="text-btn header-account" onClick={closeMenu}>
                  {user.full_name || 'حساب من'}
                </Link>
              ) : (
                <Link to="/login" className="text-btn ghost-border header-account" onClick={closeMenu}>ورود</Link>
              )}

              <button
                className="icon-btn cart-btn"
                onClick={() => { closeMenu(); openCart(); }}
                type="button"
                aria-label={cartLabel}
              >
                <span className="cart-label-full">
                  <IconGoldBox size={18} />
                  {cartLabel}
                </span>
                <span className="cart-ico-mobile"><IconGoldBox size={22} /></span>
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

          <div className="header-search-mobile-row">
            <SiteSearch className="header-search compact" />
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
          <div className="mobile-nav-search">
            <SiteSearch className="header-search compact" onSubmitExtra={closeMenu} />
          </div>
          <div className="mobile-nav-links">
            <NavLink to="/" end onClick={closeMenu}>خانه</NavLink>

            <div className={`mobile-nav-accordion${mobileProductsOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="mobile-nav-accordion-btn"
                aria-expanded={mobileProductsOpen}
                onClick={() => setMobileProductsOpen((v) => !v)}
              >
                محصولات
                <span className="nav-drop-chev" aria-hidden />
              </button>
              {mobileProductsOpen && (
                <div className="mobile-nav-sub">
                  <Link to="/products" onClick={closeMenu}>همه‌ی محصولات</Link>
                  {catList.map((c) => (
                    <Link
                      key={c.id}
                      to={`/products?category=${encodeURIComponent(c.slug)}`}
                      onClick={closeMenu}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <NavLink to="/atelier" onClick={closeMenu}>آتلیه آنیل</NavLink>
            {secondaryNav.map((item) => (
              <NavLink key={item.key} to={item.to} onClick={closeMenu}>{item.label}</NavLink>
            ))}
          </div>
          <div className="mobile-nav-actions">
            {user ? (
              <Link to="/account" className="gold-btn" onClick={closeMenu}>حساب من</Link>
            ) : (
              <Link to="/login" className="gold-btn" onClick={closeMenu}>ورود / ثبت‌نام</Link>
            )}
            <div className="mobile-theme-block">
              <span className="mobile-theme-caption">تم فعلی: {THEME_META[theme].label}</span>
              <ThemePicker />
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
