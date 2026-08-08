import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { IconBuyback, IconConsult, IconInsuredShip, IconShieldCheck } from '../components/icons';
import { useStore } from '../store/useStore';
import { faNum, faPrice } from '../utils/format';
import type { HeroAlbumSlide, MarketRow, SiteSettings } from '../types';

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

const DEFAULT_HERO = '/hero/anil-gallery.jpg';

function useHeroSlides(site?: SiteSettings): { src: string; alt: string; caption: string; id: string }[] {
  return useMemo(() => {
    const album = (site?.hero_album || []).filter((s) => s.is_active !== false && s.image_url);
    if (album.length) {
      return album.map((s: HeroAlbumSlide) => ({
        id: String(s.id),
        src: s.image_url!,
        alt: s.alt_text || 'گالری طلا آنیل',
        caption: s.caption || '',
      }));
    }
    const legacy = site?.hero_image_url || DEFAULT_HERO;
    return [{ id: 'default', src: legacy, alt: 'گالری طلا آنیل', caption: '' }];
  }, [site?.hero_album, site?.hero_image_url]);
}

function useAlbumIndex(count: number, pause: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [count]);
  useEffect(() => {
    if (count <= 1 || pause) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 5200);
    return () => window.clearInterval(t);
  }, [count, pause]);
  return [index, setIndex] as const;
}

/** Framed hero album — fixed square frame; slides crossfade inside. */
function HeroAlbumPainting({
  slides,
  index,
  onSelect,
  paused,
  onPause,
}: {
  slides: { src: string; alt: string; caption: string; id: string }[];
  index: number;
  onSelect: (i: number) => void;
  paused: boolean;
  onPause: (v: boolean) => void;
}) {
  const current = slides[index] || slides[0];
  const multi = slides.length > 1;

  return (
    <div
      className="hero-painting"
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
    >
      <div className="hero-painting-glow" aria-hidden />
      <figure className="hero-painting-frame hero-album-frame" aria-roledescription="carousel">
        <div className="hero-album-stage">
          {slides.map((s, i) => (
            <img
              key={s.id}
              className={`hero-painting-img hero-album-slide${i === index ? ' is-active' : ''}`}
              src={s.src}
              alt={s.alt}
              decoding="async"
              fetchPriority={i === 0 ? 'high' : 'low'}
              aria-hidden={i !== index}
            />
          ))}
          <div className="hero-album-sheen" aria-hidden />
        </div>
        {multi && (
          <>
            <div className="hero-album-plate" aria-live="polite">
              <span className="hero-album-plate-label">آلبوم</span>
              <span className="hero-album-plate-count">
                {faNum(index + 1)} / {faNum(slides.length)}
              </span>
            </div>
            <div className="hero-album-dots" role="tablist" aria-label="اسلایدهای هیرو">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  className={`hero-album-dot${i === index ? ' is-active' : ''}`}
                  onClick={() => onSelect(i)}
                >
                  <span className="sr-only">اسلاید {faNum(i + 1)}</span>
                </button>
              ))}
            </div>
            <div className={`hero-album-progress${paused ? ' is-paused' : ''}`} aria-hidden />
          </>
        )}
      </figure>
      {current?.caption ? (
        <figcaption className="hero-painting-caption">{current.caption}</figcaption>
      ) : null}
    </div>
  );
}

function HeroVisual({
  site,
  slides,
  index,
  onSelect,
  paused,
  onPause,
}: {
  site?: SiteSettings;
  slides: { src: string; alt: string; caption: string; id: string }[];
  index: number;
  onSelect: (i: number) => void;
  paused: boolean;
  onPause: (v: boolean) => void;
}) {
  const allow3d = site?.hero_mode === '3d';
  const [wants3d, setWants3d] = useState(false);

  if (allow3d && wants3d) {
    return (
      <div className="hero-visual-wrap">
        <Suspense
          fallback={(
            <>
              <HeroAlbumPainting
                slides={slides}
                index={index}
                onSelect={onSelect}
                paused={paused}
                onPause={onPause}
              />
              <div className="hero-3d-loading-badge">در حال آماده‌سازی مدل ۳بعدی…</div>
            </>
          )}
        >
          <HeroRing3D />
        </Suspense>
        <button type="button" className="hero-3d-toggle outline-btn" onClick={() => setWants3d(false)}>
          بازگشت به آلبوم
        </button>
      </div>
    );
  }

  return (
    <div className="hero-visual-wrap">
      <HeroAlbumPainting
        slides={slides}
        index={index}
        onSelect={onSelect}
        paused={paused}
        onPause={onPause}
      />
      {allow3d && (
        <button type="button" className="hero-3d-toggle gold-btn" onClick={() => setWants3d(true)}>
          نمایش مدل ۳بعدی
        </button>
      )}
    </div>
  );
}

function HeroCta({
  to,
  className,
  children,
}: {
  to: string;
  className: string;
  children: ReactNode;
}) {
  const href = (to || '/products').trim() || '/products';
  if (href.startsWith('http') || href.startsWith('#')) {
    return <a href={href} className={className}>{children}</a>;
  }
  return <Link to={href.startsWith('/') ? href : `/${href}`} className={className}>{children}</Link>;
}

function HeroSection({ site }: { site?: SiteSettings }) {
  const title = (site?.hero_title || 'زیورآلات طلا،\nبا درخشش آنیل').split('\n');
  const slides = useHeroSlides(site);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useAlbumIndex(slides.length, paused);
  const subtitle = site?.hero_subtitle
    || 'قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا — فاکتور رسمی و ارسال بیمه‌شده.';
  const primaryLabel = site?.hero_cta_primary || 'مشاهده‌ی محصولات';
  const primaryUrl = site?.hero_cta_primary_url || '/products';
  const secondaryLabel = site?.hero_cta_secondary || 'قیمت لحظه‌ای طلا';
  const secondaryUrl = site?.hero_cta_secondary_url || '#market';
  const badge = site?.hero_badge || 'گالری طلا آنیل';

  return (
    <section className="home-hero-bleed">
      {/* Mobile: full-bleed album */}
      <div
        className="m-hero"
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="m-hero-media">
          {slides.map((s, i) => (
            <img
              key={s.id}
              className={`m-hero-slide${i === index ? ' is-active' : ''}`}
              src={s.src}
              alt={s.alt}
              decoding="async"
              fetchPriority={i === 0 ? 'high' : 'low'}
            />
          ))}
          <div className="m-hero-veil" />
          {slides.length > 1 && (
            <div className="m-hero-dots" role="tablist" aria-label="اسلایدهای هیرو">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`hero-album-dot${i === index ? ' is-active' : ''}`}
                  aria-selected={i === index}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="m-hero-copy">
          <div className="hero-badge">{badge}</div>
          <h1 className="hero-h1 m-hero-title">
            {title.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>
          <p className="hero-lead">{subtitle}</p>
          <div className="hero-actions">
            <HeroCta to={primaryUrl} className="gold-btn">{primaryLabel}</HeroCta>
          </div>
        </div>
      </div>

      {/* Desktop: stable framed split — album swaps inside fixed frame */}
      <div className="container home-hero d-hero">
        <HeroVisual
          site={site}
          slides={slides}
          index={index}
          onSelect={setIndex}
          paused={paused}
          onPause={setPaused}
        />
        <div className="hero-copy">
          <div className="hero-badge">{badge}</div>
          <h1 className="shimmer-text hero-h1">
            {title.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>
          <p className="hero-lead">{subtitle}</p>
          <div className="hero-actions">
            <HeroCta to={primaryUrl} className="gold-btn">{primaryLabel}</HeroCta>
            <HeroCta to={secondaryUrl} className="outline-btn hero-cta-secondary">{secondaryLabel}</HeroCta>
          </div>
        </div>
      </div>
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
        <div className="product-grid cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    ) : null,
    trust: site?.show_trust !== false ? (
      <section key="trust" className="container section-pad trust-grid-wrap">
        <div className="pricing-wrap pricing-wrap-home">
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
        <h2 className="section-title trust-heading">{site?.trust_heading || 'چرا آنیل؟'}</h2>
        <div className="trust-grid">
          {[
            { key: 'authenticity', title: 'ضمانت اصالت', desc: 'فاکتور رسمی و ضمانت کتبی', Icon: IconShieldCheck },
            { key: 'ship', title: 'ارسال بیمه‌شده', desc: 'بیمه کامل تا درب منزل', Icon: IconInsuredShip },
            { key: 'buyback', title: 'بازخرید تضمینی', desc: 'بر اساس نرخ روز طلا', Icon: IconBuyback },
            { key: 'consult', title: 'مشاوره تخصصی', desc: 'همراهی در تمام مراحل', Icon: IconConsult },
          ].map((t) => (
            <div key={t.key} className="trust-item">
              <div className="trust-ico" aria-hidden>
                <t.Icon size={18} />
              </div>
              <div>
                <div className="trust-title">{t.title}</div>
                <div className="trust-desc">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="trust-cta-row">
          <Link to="/products" className="gold-btn trust-cta">شروع خرید از گالری</Link>
        </div>
      </section>
    ) : null,
  };

  return (
    <div className="home">
      {order.map((key) => sections[key]).filter(Boolean)}

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-top">
            <div className="footer-brand-row">
              <img className="logo-img footer-logo" src={site?.brand_logo_url || '/logo.png'} alt="" />
              <div>
                <div className="footer-brand">{site?.brand_name || 'Anil'}</div>
                <div className="logo-sub">{site?.brand_tagline || 'درخششی ابدی'}</div>
              </div>
            </div>
            <p className="footer-tag">{site?.footer_tagline || 'زیورآلات اصیل با قیمت شفاف و لحظه‌ای.'}</p>
            <Link to="/products" className="footer-shop-btn">مشاهده محصولات</Link>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h3>دسته‌بندی‌ها</h3>
              <ul>
                {categories.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link to={`/products?category=${c.slug}`}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="footer-col">
              <h3>خدمات</h3>
              <ul>
                <li><Link to="/p/راهنمای-خرید">راهنمای خرید</Link></li>
                <li><Link to="/blog">بلاگ</Link></li>
                <li><Link to="/products">محصولات</Link></li>
                <li><Link to="/account">پیگیری سفارش</Link></li>
              </ul>
            </div>
            <div className="footer-col footer-contact">
              <h3>تماس سریع</h3>
              <ul>
                <li>{site?.contact_address || 'تهران، بازار بزرگ طلا'}</li>
                <li>
                  <a
                    href={`tel:${(site?.contact_phone || '02112345678').replace(/[^\d+]/g, '')}`}
                    dir="ltr"
                  >
                    {site?.contact_phone || '۰۲۱-۱۲۳۴۵۶۷۸'}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${site?.contact_email || 'info@goldanil.ir'}`} dir="ltr">
                    {site?.contact_email || 'info@goldanil.ir'}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-copy footer-copy-row">
            <span>© گالری طلا آنیل ۱۴۰۵</span>
            <span>پرداخت امن · ضمانت اصالت</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
