import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { IconBuyback, IconConsult, IconInsuredShip, IconShieldCheck } from '../components/icons';
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

const DEFAULT_HERO = '/hero/anil-gallery.jpg';

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
  const heroSrc = site?.hero_image_url || DEFAULT_HERO;
  const subtitle = site?.hero_subtitle
    || 'قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا — فاکتور رسمی و ارسال بیمه‌شده.';
  const primaryLabel = site?.hero_cta_primary || 'مشاهده‌ی محصولات';
  const primaryUrl = site?.hero_cta_primary_url || '/products';
  const secondaryLabel = site?.hero_cta_secondary || 'قیمت لحظه‌ای طلا';
  const secondaryUrl = site?.hero_cta_secondary_url || '#market';
  const allow3d = site?.hero_mode === '3d';
  const [wants3d, setWants3d] = useState(false);

  return (
    <section className="home-hero-bleed">
      <div className="hero-full">
        <div className="hero-full-media">
          {allow3d && wants3d ? (
            <Suspense fallback={<img src={heroSrc} alt="" decoding="async" />}>
              <div className="hero-full-3d">
                <HeroRing3D />
              </div>
            </Suspense>
          ) : (
            <img
              src={heroSrc}
              alt="Anil Gold Gallery"
              decoding="async"
              fetchPriority="high"
            />
          )}
          <div className="hero-full-veil" />
        </div>

        <div className="hero-full-copy">
          <h1 className="hero-full-title">
            {title.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>
          <p className="hero-full-lead">{subtitle}</p>
          <div className="hero-actions">
            <HeroCta to={primaryUrl} className="gold-btn">{primaryLabel}</HeroCta>
            <HeroCta to={secondaryUrl} className="outline-btn hero-cta-secondary">{secondaryLabel}</HeroCta>
          </div>
          {allow3d && (
            <button
              type="button"
              className="hero-3d-inline"
              onClick={() => setWants3d((v) => !v)}
            >
              {wants3d ? 'بازگشت به تصویر برند' : 'نمایش مدل ۳بعدی'}
            </button>
          )}
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
                  <a href={`mailto:${site?.contact_email || 'info@anilgold.ir'}`} dir="ltr">
                    {site?.contact_email || 'info@anilgold.ir'}
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
