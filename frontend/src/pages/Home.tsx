import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { IconBuyback, IconConsult, IconShieldCheck } from '../components/icons';
import { useStore } from '../store/useStore';
import { calcPrice, faNum, faPrice } from '../utils/format';
import type { Category, HeroAlbumSlide, MarketRow, SiteSettings } from '../types';

/** Heavy WebGL — only imported after the user opts in (never during first paint). */
const loadHeroRing3D = () =>
  import('../components/HeroRing3D').then((m) => ({ default: m.HeroRing3D }));
const HeroRing3D = lazy(loadHeroRing3D);

const DEFAULT_HERO = '/hero/anil-gallery.jpg';
const CAMPAIGN_HERO = '/home/hero-gloved-hand.webp';

const HONEST_SUBTITLE =
  'قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا — بازدید و مشاوره در گالری آنیل، ابهر.';

const SAMPLE_PHONE_RE = /^(0?21[- ]?12345678|۰۲۱[- ]?۱۲۳۴۵۶۷۸)$/;
const TEHRAN_SAMPLE_RE = /تهران|بازار بزرگ طلا/;
const UNVERIFIED_CLAIM_RE = /بیمه|فاکتور رسمی|ارسال.*کشور|درب منزل|پرداخت امن|بازخرید تضمینی/;

/** Concept art for category tiles when the category has no real photo. */
const CATEGORY_ART: { match: RegExp; src: string }[] = [
  { match: /انگشتر|سولیتر/, src: '/home/category-rings.webp' },
  { match: /گردن|زنجیر/, src: '/home/category-necklaces.webp' },
  { match: /دستبند|النگو/, src: '/home/category-bracelets.webp' },
  { match: /گوشواره/, src: '/home/category-earrings.webp' },
  { match: /سکه|شمش/, src: '/home/category-gold-bars.webp' },
  { match: /نیم.?ست|نیمست/, src: '/home/category-half-set.webp' },
];

const DEFAULT_SECTION_ORDER = [
  'hero',
  'rates',
  'featured',
  'categories',
  'collection',
  'calculator',
  'trust',
  'editorial',
  'contact',
];

function categoryArt(c: Category): string | null {
  if (c.image_url) return c.image_url;
  const hay = `${c.name} ${c.slug}`;
  return CATEGORY_ART.find((m) => m.match.test(hay))?.src ?? null;
}

function honestSubtitle(raw?: string | null): string {
  const t = (raw || '').trim();
  if (!t || UNVERIFIED_CLAIM_RE.test(t)) return HONEST_SUBTITLE;
  return t;
}

function contactAddress(site?: SiteSettings): string {
  const a = (site?.contact_address || '').trim();
  if (!a || TEHRAN_SAMPLE_RE.test(a)) return 'ابهر، استان زنجان';
  return a;
}

function contactPhone(site?: SiteSettings): string {
  const p = (site?.contact_phone || '').trim();
  if (!p || SAMPLE_PHONE_RE.test(p.replace(/\s/g, ''))) return '';
  return p;
}

function contactEmail(site?: SiteSettings): string {
  return (site?.contact_email || '').trim() || 'info@goldanil.ir';
}

function formatGoldTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function isStale(iso?: string | null, maxMs = 30 * 60 * 1000): boolean {
  if (!iso) return true;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > maxMs;
}

function IconChart({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4.5 18.5V5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4.5 18.5h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 14.5v4M12 10.5v8M16 7.5v11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconCalc({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="7.5" y="6" width="9" height="3.2" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.5 12.5h1.2M12 12.5h1.2M15.5 12.5h1.2M8.5 15.5h1.2M12 15.5h1.2M15.5 15.5h1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconScale({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v14M7 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 8 4.5 14.5h5L7 8ZM17 8l-2.5 6.5h5L17 8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 18.5h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconLayers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m12 4.5 8 4-8 4-8-4 8-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m4 12.2 8 4 8-4M4 15.8l8 4 8-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RatesBoard({
  rows,
  updatedAt,
}: {
  rows: MarketRow[];
  updatedAt?: string | null;
}) {
  const stale = isStale(updatedAt);
  const when = formatGoldTime(updatedAt);
  const ordered = useMemo(() => {
    const g18 = rows.find((r) => r.key === 'g18');
    const rest = rows.filter((r) => r.key !== 'g18');
    return g18 ? [g18, ...rest] : rows;
  }, [rows]);

  return (
    <section id="market" className="rates-board" aria-label="نرخ زنده بازار">
      <div className="container rates-board-inner">
        <div className="rates-board-status">
          <span className={`live-dot${stale ? ' is-stale' : ''}`} />
          {stale ? 'نرخ ممکن است به‌روز نباشد' : 'به‌روزرسانی زنده قیمت‌ها'}
          {when ? ` | آخرین به‌روزرسانی: ${when}` : ''}
        </div>
        <div className="rates-scroll" tabIndex={0} aria-label="کارت‌های نرخ طلا و سکه">
          {ordered.map((r) => (
            <div key={r.key} className={`rate-chip${r.key === 'g18' ? ' featured' : ''}`}>
              <div className="rate-chip-label">{r.label}</div>
              <div className="rate-chip-value">
                {r.dollar ? `$${faPrice(r.v)}` : faPrice(r.v)}
              </div>
              <div className="rate-chip-unit">{r.unit}</div>
            </div>
          ))}
        </div>
        <p className="rates-note rates-note-below">
          قیمت محصولات گالری بر اساس طلای ۱۸ عیار محاسبه می‌شود.
        </p>
      </div>
    </section>
  );
}

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
    const legacy = site?.hero_image_url;
    if (legacy) {
      return [{ id: 'site', src: legacy, alt: 'گالری طلا آنیل', caption: '' }];
    }
    // Prefer existing brand photo; campaign art is fallback only
    return [
      { id: 'brand', src: DEFAULT_HERO, alt: 'گالری طلا آنیل', caption: '' },
      { id: 'campaign', src: CAMPAIGN_HERO, alt: 'آثار گالری آنیل', caption: '' },
    ];
  }, [site?.hero_album, site?.hero_image_url]);
}

function useAlbumIndex(count: number, pause: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [count]);
  useEffect(() => {
    // Handoff: avoid autoplay sliders — only advance if multi & user hasn't interacted recently
    if (count <= 1 || pause) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 7200);
    return () => window.clearInterval(t);
  }, [count, pause]);
  return [index, setIndex] as const;
}

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
              width={720}
              height={720}
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
  const title = (site?.hero_title || 'طلا،\nآن‌گونه که باید بدرخشد').split('\n');
  const slides = useHeroSlides(site);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useAlbumIndex(slides.length, paused);
  const subtitle = honestSubtitle(site?.hero_subtitle);
  const primaryLabel = site?.hero_cta_primary || 'مشاهده محصولات';
  const primaryUrl = site?.hero_cta_primary_url || '/products';
  const secondaryLabel = site?.hero_cta_secondary || 'قیمت لحظه‌ای طلا';
  const secondaryUrl = site?.hero_cta_secondary_url || '#market';
  const badge = site?.hero_badge || 'گالری طلای آنیل';

  return (
    <section className="home-hero-bleed home-hero-compact">
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
              width={800}
              height={600}
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
          <h1 className="hero-h1 m-hero-title hero-reveal">
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
          <h1 className="shimmer-text hero-h1 hero-reveal">
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
            <HeroCta to={secondaryUrl} className="outline-btn hero-cta-secondary">
              <span className="hero-cta-ico" aria-hidden><IconChart size={16} /></span>
              {secondaryLabel}
            </HeroCta>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedRail({ products }: { products: import('../types').Product[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const step = Math.min(320, el.clientWidth * 0.7);
    el.scrollBy({ left: dir * -step, behavior: 'smooth' });
  };

  if (!products.length) return null;

  return (
    <section className="container section-pad home-featured">
      <div className="section-row">
        <div>
          <h2 className="section-title tight">محصولات منتخب</h2>
          <p className="section-sub">جدیدترین و محبوب‌ترین زیورآلات آنیل</p>
        </div>
        <div className="section-row-actions">
          <div className="rail-nav" role="group" aria-label="جابه‌جایی محصولات">
            <button type="button" className="rail-nav-btn" aria-label="قبلی" onClick={() => scrollBy(-1)}>
              ‹
            </button>
            <button type="button" className="rail-nav-btn" aria-label="بعدی" onClick={() => scrollBy(1)}>
              ›
            </button>
          </div>
          <Link to="/products" className="outline-btn section-all-btn">مشاهده همه</Link>
        </div>
      </div>
      <div className="product-rail" ref={scroller}>
        {products.map((p) => (
          <div key={p.id} className="product-rail-item">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoriesSection({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <section className="container section-pad home-categories">
      <div className="section-row">
        <div>
          <h2 className="section-title tight">دسته‌بندی محصولات</h2>
          <p className="section-sub">دسته‌بندی مورد علاقه خود را انتخاب کنید</p>
        </div>
        <Link to="/products" className="outline-btn section-all-btn">مشاهده همه دسته‌ها</Link>
      </div>
      <div className="cat-rail" tabIndex={0} aria-label="دسته‌بندی‌ها">
        {categories.map((c) => {
          const art = categoryArt(c);
          return (
            <Link key={c.id} to={`/products?category=${encodeURIComponent(c.slug)}`} className="cat-tile">
              <div className="cat-tile-media">
                {art ? (
                  <img src={art} alt="" loading="lazy" decoding="async" width={420} height={420} />
                ) : (
                  <div className="cat-tile-fallback">{c.name.slice(0, 1)}</div>
                )}
                <div className="cat-tile-veil" />
              </div>
              <div className="cat-tile-copy">
                <div className="cat-tile-title">{c.name}</div>
                <span className="cat-tile-link">مشاهده محصولات</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CollectionBanner({ categories }: { categories: Category[] }) {
  const target =
    categories.find((c) => /نیم.?ست|سرویس|گردن/.test(`${c.name}${c.slug}`)) || categories[0];
  const to = target ? `/products?category=${encodeURIComponent(target.slug)}` : '/products';

  return (
    <section className="container section-pad home-collection">
      <div
        className="collection-banner"
        style={{ backgroundImage: "url('/home/collection-banner.webp')" }}
      >
        <div className="collection-banner-copy">
          <h2>مجموعه‌ای از زیبایی ماندگار</h2>
          <p>طراحی‌های خاص، مناسب لحظه‌های مهم زندگی شما</p>
          <Link to={to} className="outline-btn collection-cta">مشاهده کلکسیون</Link>
        </div>
      </div>
    </section>
  );
}

function HomeGoldCalculator() {
  const gold = useStore((s) => s.goldPrice);
  const rate18 = gold?.price_18k_per_gram ?? 0;
  const rate24 = gold?.price_24k_per_gram ?? 0;
  const [weightRaw, setWeightRaw] = useState('۱۰');
  const [karat, setKarat] = useState<'18' | '24'>('18');
  const weightId = useId();
  const karatId = useId();

  const weight = useMemo(() => {
    const n = Number(
      String(weightRaw)
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[^\d.]/g, ''),
    );
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [weightRaw]);

  const rate = karat === '24' ? rate24 : rate18;
  // Estimate with a typical mid-range making fee; always labeled as approximate
  const feeRatio = 0.12;
  const estimate = rate > 0 && weight > 0 ? calcPrice(weight, rate, feeRatio, 0).total : 0;

  return (
    <section className="container section-pad home-calculator" aria-labelledby="home-calc-title">
      <div className="home-calc-head">
        <h2 id="home-calc-title" className="section-title tight">محاسبه قیمت آنلاین طلا</h2>
        <p className="section-sub">
          وزن و عیار را وارد کنید تا برآورد تقریبی قیمت را ببینید. مبلغ نهایی قطعه پس از اجرت واقعی مشخص می‌شود.
        </p>
      </div>
      <div className="home-calc-grid">
        <label className="home-calc-card" htmlFor={weightId}>
          <span className="home-calc-label">وزن (گرم)</span>
          <span className="home-calc-field">
            <input
              id={weightId}
              inputMode="decimal"
              className="home-calc-input"
              value={weightRaw}
              onChange={(e) => setWeightRaw(e.target.value)}
              aria-describedby="home-calc-hint"
            />
            <span className="home-calc-ico" aria-hidden><IconScale /></span>
          </span>
        </label>
        <label className="home-calc-card" htmlFor={karatId}>
          <span className="home-calc-label">عیار طلا</span>
          <span className="home-calc-field">
            <select
              id={karatId}
              className="home-calc-input"
              value={karat}
              onChange={(e) => setKarat(e.target.value as '18' | '24')}
            >
              <option value="18">۱۸ عیار</option>
              <option value="24">۲۴ عیار</option>
            </select>
            <span className="home-calc-ico" aria-hidden><IconLayers /></span>
          </span>
        </label>
        <div className="home-calc-card home-calc-result" aria-live="polite">
          <span className="home-calc-label">قیمت تقریبی</span>
          <div className="home-calc-result-row">
            <div>
              <div className="home-calc-value">
                {rate > 0 && weight > 0 ? faPrice(estimate) : '—'}
              </div>
              <div className="home-calc-unit">تومان</div>
            </div>
            <span className="home-calc-ico" aria-hidden><IconCalc /></span>
          </div>
        </div>
      </div>
      <p id="home-calc-hint" className="home-calc-hint">
        {rate > 0
          ? `برآورد با نرخ ${karat === '24' ? '۲۴' : '۱۸'} عیار و اجرت نمونه ۱۲٪؛ برای قیمت قطعه واقعی به صفحه محصول مراجعه کنید.`
          : 'در حال دریافت نرخ زنده طلا…'}
      </p>
    </section>
  );
}

function WhyAnil({ heading }: { heading?: string }) {
  const items = [
    {
      key: 'live',
      title: 'قیمت‌گذاری لحظه‌ای',
      desc: 'بر پایه نرخ روز طلای گالری',
      Icon: IconChart,
    },
    {
      key: 'select',
      title: 'انتخاب شفاف',
      desc: 'وزن و مشخصات هر قطعه مشخص است',
      Icon: IconShieldCheck,
    },
    {
      key: 'consult',
      title: 'مشاوره تخصصی',
      desc: 'همراهی برای انتخاب درست',
      Icon: IconConsult,
    },
    {
      key: 'visit',
      title: 'بازدید حضوری در ابهر',
      desc: 'گالری آنیل، استان زنجان',
      Icon: IconBuyback,
    },
  ];

  return (
    <section className="container section-pad trust-grid-wrap home-why">
      <div className="home-calc-head">
        <h2 className="section-title tight">{heading || 'چرا از آنیل خرید کنیم؟'}</h2>
        <p className="section-sub">تجربه‌ای شفاف از انتخاب طلا با قیمت لحظه‌ای</p>
      </div>
      <div className="trust-grid why-grid">
        {items.map((t) => (
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
        <Link to="/products" className="gold-btn trust-cta">مشاهده محصولات</Link>
      </div>
    </section>
  );
}

function EditorialStrip() {
  return (
    <section className="container section-pad home-editorial">
      <div
        className="editorial-strip"
        style={{ backgroundImage: "url('/home/editorial-triptych.webp')" }}
      >
        <div className="editorial-copy">
          <h2>نگاهی نزدیک‌تر به جزئیات</h2>
          <p>قطعات منتخب گالری را در کاتالوگ ببینید</p>
          <Link to="/products" className="outline-btn">ورود به گالری</Link>
        </div>
      </div>
    </section>
  );
}

function ContactBand({ site }: { site?: SiteSettings }) {
  const address = contactAddress(site);
  const phone = contactPhone(site);
  const email = contactEmail(site);
  const mapsQ = encodeURIComponent(address);

  return (
    <section className="container section-pad home-contact" aria-labelledby="home-contact-title">
      <div className="contact-band">
        <div
          className="contact-band-art"
          style={{ backgroundImage: "url('/home/contact-atmosphere.webp')" }}
          role="img"
          aria-label="تصویر تزئینی فضای شهری — تصویر واقعی گالری نیست"
        />
        <div className="contact-band-copy">
          <h2 id="home-contact-title">بازدید و تماس</h2>
          <p className="contact-band-lead">گالری طلای آنیل — ابهر</p>
          <ul className="contact-band-list">
            <li>{address}</li>
            {phone ? (
              <li>
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} dir="ltr">{phone}</a>
              </li>
            ) : null}
            <li>
              <a href={`mailto:${email}`} dir="ltr">{email}</a>
            </li>
          </ul>
          <div className="contact-band-actions">
            <a
              className="outline-btn"
              href={`https://www.google.com/maps/search/?api=1&query=${mapsQ}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              مسیر روی نقشه
            </a>
            <a className="gold-btn" href={`mailto:${email}`}>ارسال ایمیل</a>
          </div>
          <p className="contact-band-note">تصویر پس‌زمینه صرفاً تزئینی است و نمای فروشگاه نیست.</p>
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
    queryFn: () => api.products({ page_size: '12', ordering: '-created_at' }).then((r) => r.data.results),
  });

  const categories = categoriesData ?? [];
  const products = productsData ?? [];
  const featured = products.slice(0, 8);

  const order = useMemo(() => {
    const raw = site?.section_order?.length ? [...site.section_order] : [...DEFAULT_SECTION_ORDER];
    // Ensure new sections appear even if CMS still has the old five-key order
    for (const key of DEFAULT_SECTION_ORDER) {
      if (!raw.includes(key)) {
        if (key === 'featured' && raw.includes('categories')) {
          const i = raw.indexOf('categories');
          raw.splice(i, 0, 'featured');
        } else if (key === 'categories' && raw.includes('featured')) {
          const i = raw.indexOf('featured');
          raw.splice(i + 1, 0, 'categories');
        } else {
          raw.push(key);
        }
      }
    }
    // Prefer featured before categories (handoff order)
    const fi = raw.indexOf('featured');
    const ci = raw.indexOf('categories');
    if (fi > -1 && ci > -1 && fi > ci) {
      raw.splice(fi, 1);
      raw.splice(ci, 0, 'featured');
    }
    return raw;
  }, [site?.section_order]);

  const sections: Record<string, ReactNode> = {
    hero: <HeroSection key="hero" site={site} />,
    rates:
      site?.show_rates !== false && goldPrice?.market_rows?.length ? (
        <RatesBoard
          key="rates"
          rows={goldPrice.market_rows}
          updatedAt={goldPrice.created_at}
        />
      ) : site?.show_rates !== false ? (
        <section key="rates-empty" id="market" className="rates-board rates-board-empty">
          <div className="container">
            <div className="rates-board-status">
              <span className="live-dot is-stale" />
              نرخ طلا در دسترس نیست — کمی بعد دوباره تلاش کنید
            </div>
          </div>
        </section>
      ) : null,
    featured:
      site?.show_featured !== false ? (
        <FeaturedRail key="featured" products={featured} />
      ) : null,
    categories:
      site?.show_categories !== false ? (
        <CategoriesSection key="categories" categories={categories} />
      ) : null,
    collection: <CollectionBanner key="collection" categories={categories} />,
    calculator: <HomeGoldCalculator key="calculator" />,
    trust:
      site?.show_trust !== false ? (
        <WhyAnil key="trust" heading={site?.trust_heading} />
      ) : null,
    editorial: <EditorialStrip key="editorial" />,
    contact: <ContactBand key="contact" site={site} />,
  };

  const address = contactAddress(site);
  const phone = contactPhone(site);
  const email = contactEmail(site);

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
            <p className="footer-tag">
              {site?.footer_tagline && !UNVERIFIED_CLAIM_RE.test(site.footer_tagline)
                ? site.footer_tagline
                : 'زیورآلات اصیل با قیمت شفاف و لحظه‌ای — گالری آنیل، ابهر.'}
            </p>
            <Link to="/products" className="footer-shop-btn">مشاهده محصولات</Link>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h3>دسته‌بندی‌ها</h3>
              <ul>
                {categories.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link to={`/products?category=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
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
                <li><Link to="/atelier">برآورد بودجه</Link></li>
                <li><Link to="/account">حساب کاربری</Link></li>
              </ul>
            </div>
            <div className="footer-col footer-contact">
              <h3>تماس</h3>
              <ul>
                <li>{address}</li>
                {phone ? (
                  <li>
                    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} dir="ltr">{phone}</a>
                  </li>
                ) : null}
                <li>
                  <a href={`mailto:${email}`} dir="ltr">{email}</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-copy footer-copy-row">
            <span>© گالری طلا آنیل ۱۴۰۵</span>
            <span>قیمت لحظه‌ای · مشاوره حضوری</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
