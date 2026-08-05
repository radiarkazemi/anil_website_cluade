import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../store/useStore';
import { faNum, faPrice } from '../utils/format';
import type { MarketRow, SiteSettings } from '../types';

/** Heavy WebGL — only imported after the user opts in (never during first paint). */
const loadHeroRing3D = () =>
  import('../components/HeroRing3D').then((m) => ({ default: m.HeroRing3D }));
const HeroRing3D = lazy(loadHeroRing3D);

function RatesBoard({ rows }: { rows: MarketRow[] }) {
  return (
    <section id="market" className="rates-board" aria-label="نرخ زنده بازار">
      <div className="container rates-board-inner">
        <div className="rates-board-head">
          <div>
            <div className="rates-live">
              <span className="live-dot" />
              به‌روزرسانی زنده
            </div>
            <h2>نرخ طلا و سکه</h2>
          </div>
          <p className="rates-note">قیمت محصولات گالری بر اساس طلای ۱۸ عیار محاسبه می‌شود.</p>
        </div>
        <div className="rates-grid">
          {rows.map((r) => (
            <div key={r.key} className={`rate-chip${r.key === 'g18' ? ' featured' : ''}`}>
              <div className="rate-chip-label">{r.label}</div>
              <div className="rate-chip-value">
                {r.dollar ? `$${faPrice(r.v)}` : faPrice(r.v)}
              </div>
              <div className="rate-chip-unit">{r.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Ready-to-go jewelry photo — lightweight, used for first paint / loading. */
function HeroJewel({ src }: { src: string }) {
  const [rx, setRx] = useState(-8);
  const [ry, setRy] = useState(12);
  const auto = useRef(true);
  const resumeTimer = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      if (auto.current) setRy((v) => v + dt * 0.018);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pauseAuto = () => {
    auto.current = false;
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      auto.current = true;
    }, 2200);
  };

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    pauseAuto();
    const pt = 'touches' in e ? e.touches[0] : e;
    const start = { x: pt.clientX, y: pt.clientY, rx, ry };
    const move = (ev: MouseEvent | TouchEvent) => {
      const p = 'touches' in ev ? (ev as TouchEvent).touches[0] : (ev as MouseEvent);
      setRy(start.ry + (p.clientX - start.x) * 0.55);
      setRx(Math.max(-42, Math.min(42, start.rx - (p.clientY - start.y) * 0.4)));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  return (
    <div className="hero-ring">
      <div className="hero-ring-glow" />
      <div className="hero-orbit-ring" aria-hidden />
      <div
        className="hero-ring-scene hero-jewel-scene"
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg)` }}
      >
        <img
          className="hero-jewel-img"
          src={src}
          alt="زیورآلات آنیل"
          draggable={false}
          decoding="async"
          fetchPriority="high"
        />
      </div>
      <div className="hero-ring-hint">بکشید تا بچرخانید</div>
    </div>
  );
}

/**
 * Hero visual strategy:
 * - Always paint the real jewelry photo first (fast, good-looking).
 * - Never mount WebGL during website load.
 * - If admin enables 3D, user can opt-in with a button after the page is ready.
 */
function HeroVisual({ site }: { site?: SiteSettings }) {
  const heroSrc = site?.hero_image_url || '/hero/ring.png';
  const allow3d = site?.hero_mode === '3d';
  const [wants3d, setWants3d] = useState(false);

  if (allow3d && wants3d) {
    return (
      <div className="hero-visual-wrap">
        <Suspense
          fallback={(
            <div className="hero-ring">
              <HeroJewel src={heroSrc} />
              <div className="hero-3d-loading-badge">در حال آماده‌سازی مدل ۳بعدی…</div>
            </div>
          )}
        >
          <HeroRing3D />
        </Suspense>
        <button type="button" className="hero-3d-toggle outline-btn" onClick={() => setWants3d(false)}>
          بازگشت به تصویر
        </button>
      </div>
    );
  }

  return (
    <div className="hero-visual-wrap">
      <HeroJewel src={heroSrc} />
      {allow3d && (
        <button
          type="button"
          className="hero-3d-toggle gold-btn"
          onClick={() => setWants3d(true)}
        >
          نمایش مدل ۳بعدی
        </button>
      )}
    </div>
  );
}

function HeroSection({ site }: { site?: SiteSettings }) {
  const title = (site?.hero_title || 'طلا،\nآن‌گونه که باید بدرخشد').split('\n');

  return (
    <section className="container home-hero">
      <div className="hero-copy">
        <div className="hero-badge">{site?.hero_badge || 'گالری طلا آنیل'}</div>
        <h1 className="shimmer-text hero-h1">
          {title.map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {line}
            </span>
          ))}
        </h1>
        <p className="hero-lead">
          {site?.hero_subtitle
            || 'مجموعه‌ای زنده از زیورآلات دست‌ساز، با قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا.'}
        </p>
        <div className="hero-actions">
          <Link to="/products" className="gold-btn">{site?.hero_cta_primary || 'مشاهده‌ی محصولات'}</Link>
          <a href="#market" className="outline-btn">{site?.hero_cta_secondary || 'قیمت لحظه‌ای طلا'}</a>
        </div>
      </div>
      <HeroVisual site={site} />
    </section>
  );
}

export function Home() {
  const goldPrice = useStore((s) => s.goldPrice);
  const { data: site } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.siteSettings().then((r) => r.data),
    staleTime: 60_000,
  });
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories().then((r) => r.data),
  });
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products().then((r) => r.data.results),
  });

  const categories = categoriesData ?? [];
  const products = productsData ?? [];
  const featured = products.slice(0, 8);
  const gp = goldPrice?.price_18k_per_gram ?? 0;

  const order = site?.section_order?.length
    ? site.section_order
    : ['hero', 'rates', 'categories', 'featured', 'trust'];

  const sections: Record<string, ReactNode> = {
    hero: <HeroSection key="hero" site={site} />,
    rates: site?.show_rates !== false && goldPrice?.market_rows
      ? <RatesBoard key="rates" rows={goldPrice.market_rows} />
      : null,
    categories: site?.show_categories !== false ? (
      <section key="categories" className="container section-pad">
        <h2 className="section-title">دسته‌بندی محصولات</h2>
        <div className="cat-grid">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} className="cat-card">
              <div className="cat-media">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} loading="lazy" />
                ) : (
                  <div className="cat-icon">{faNum(c.display_count || c.product_count)}</div>
                )}
              </div>
              <div className="cat-title">{c.name}</div>
              <div className="cat-sub">{faNum(c.display_count || c.product_count)} محصول</div>
            </Link>
          ))}
        </div>
      </section>
    ) : null,
    featured: site?.show_featured !== false ? (
      <section key="featured" className="container section-pad">
        <div className="section-row">
          <div>
            <div className="section-eyebrow">منتخب گالری</div>
            <h2 className="section-title tight">پرفروش‌ترین‌ها</h2>
          </div>
          <Link to="/products" className="text-link">مشاهده‌ی همه</Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    ) : null,
    trust: site?.show_trust !== false ? (
      <section key="trust" className="container section-pad trust-grid-wrap">
        <div className="pricing-wrap" style={{ marginBottom: 28 }}>
          <div className="pricing-band-classic">
            <div>
              <div className="section-eyebrow">فناوری آنیل</div>
              <h2 className="section-title tight">قیمت‌گذاری پویا و لحظه‌ای</h2>
              <p className="pricing-copy">
                قیمت هر قطعه به‌صورت زنده و بر پایه‌ی نرخ روز طلا محاسبه می‌شود.
              </p>
            </div>
            <div className="pricing-formula">
              (وزن × <strong>{faPrice(gp)}</strong>)
              <br />
              + اجرت + مالیات
              <br />
              <span className="pricing-eq">= قیمت نهایی زنده</span>
            </div>
          </div>
        </div>
        <div className="trust-grid">
          {[
            { title: 'ضمانت اصالت', desc: 'فاکتور رسمی و ضمانت کتبی برای هر قطعه' },
            { title: 'ارسال بیمه‌شده', desc: 'بسته‌بندی امن و بیمه‌ی کامل تا درب منزل' },
            { title: 'بازخرید تضمینی', desc: 'امکان بازخرید بر اساس نرخ روز طلا' },
            { title: 'مشاوره‌ی تخصصی', desc: 'همراهی کارشناسان آنیل در تمام مراحل' },
          ].map((t) => (
            <div key={t.title} className="trust-item">
              <div className="trust-mark" />
              <div>
                <div className="trust-title">{t.title}</div>
                <div className="trust-desc">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null,
  };

  return (
    <div className="home">
      {order.map((key) => sections[key]).filter(Boolean)}

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <div className="footer-brand-row">
              <img className="logo-img footer-logo" src={site?.brand_logo_url || '/logo.png'} alt="" />
              <div>
                <div className="footer-brand">{site?.brand_name || 'Anil'}</div>
                <div className="logo-sub">{site?.brand_tagline || 'درخششی ابدی'}</div>
              </div>
            </div>
            <p className="footer-tag">گالری طلا آنیل، جایی برای انتخاب زیورآلات اصیل با قیمت شفاف و لحظه‌ای.</p>
          </div>
          <div>
            <h3>دسته‌بندی‌ها</h3>
            <ul>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/products?category=${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>خدمات مشتریان</h3>
            <ul>
              <li><Link to="/p/راهنمای-خرید">راهنمای خرید</Link></li>
              <li><Link to="/blog">بلاگ</Link></li>
              <li><Link to="/products">محصولات</Link></li>
            </ul>
          </div>
          <div>
            <h3>تماس با ما</h3>
            <ul>
              <li>تهران، بازار بزرگ طلا</li>
              <li>۰۲۱ - ۱۲۳۴ ۵۶۷۸</li>
              <li>info@anilgold.ir</li>
            </ul>
          </div>
        </div>
        <div className="container footer-copy footer-copy-row">
          <span>© گالری طلا آنیل ۱۴۰۵ — تمامی حقوق محفوظ است.</span>
          <span>نماد اعتماد الکترونیکی · درگاه پرداخت امن</span>
        </div>
      </footer>
    </div>
  );
}
