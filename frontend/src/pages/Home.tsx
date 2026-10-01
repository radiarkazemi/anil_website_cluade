import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
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
import {
  IconChart,
  IconHeart,
  IconInsuredShip,
  IconInvoice,
  IconShieldCheck,
  IconShoppingBag,
} from '../components/icons';
import { ContactBand, SiteFooter } from '../components/SiteChrome';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { useUI } from '../store/uiStore';
import { useFavorites } from '../store/favoritesStore';
import { calcPrice, faNum, faPrice, parseWeightGrams, WEIGHT_DECIMALS } from '../utils/format';
import { mediaUrl } from '../utils/mediaUrl';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';
import type { Category, ContentPage, GoldPrice, HeroAlbumSlide, MarketRow, Product, SiteSettings } from '../types';

/** Heavy WebGL — only imported after the user opts in (never during first paint). */
const loadHeroRing3D = () =>
  import('../components/HeroRing3D').then((m) => ({ default: m.HeroRing3D }));
const HeroRing3D = lazy(loadHeroRing3D);

/** Handoff section-01 campaign artwork — used for the homepage hero painting. */
const HANDOFF_HERO = '/home/hero-gloved-hand.webp';

const HONEST_SUBTITLE =
  'قیمت‌گذاری لحظه‌ای بر پایه‌ی نرخ روز طلا — بازدید و مشاوره در گالری آنیل، ابهر.';

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
  'blog',
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

function GoldBarsMark() {
  const gid = useId().replace(/:/g, '');
  const g = `gbar-${gid}`;
  const s = `gbar-side-${gid}`;
  const t = `gbar-top-${gid}`;
  return (
    <svg className="rate-bars-ico" viewBox="0 0 72 56" aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6e2a8" />
          <stop offset="45%" stopColor="#d4a84b" />
          <stop offset="100%" stopColor="#8a6414" />
        </linearGradient>
        <linearGradient id={s} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9952e" />
          <stop offset="100%" stopColor="#5c4010" />
        </linearGradient>
        <linearGradient id={t} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#e0b85a" />
          <stop offset="100%" stopColor="#fff1c4" />
        </linearGradient>
      </defs>
      {/* back / top bar */}
      <path d="M22 10h28l8 6H30l-8-6Z" fill={`url(#${t})`} />
      <path d="M22 10v8l8 6V16l-8-6Z" fill={`url(#${s})`} opacity=".9" />
      <path d="M30 16h28v8H38l-8-8Z" fill={`url(#${g})`} />
      {/* middle bar */}
      <path d="M14 22h28l8 6H22l-8-6Z" fill={`url(#${t})`} />
      <path d="M14 22v8l8 6V28l-8-6Z" fill={`url(#${s})`} opacity=".9" />
      <path d="M22 28h28v8H30l-8-8Z" fill={`url(#${g})`} />
      {/* front / bottom bar */}
      <path d="M6 34h28l8 6H14l-8-6Z" fill={`url(#${t})`} />
      <path d="M6 34v8l8 6V40l-8-6Z" fill={`url(#${s})`} opacity=".95" />
      <path d="M14 40h28v8H22l-8-8Z" fill={`url(#${g})`} />
    </svg>
  );
}

function rateUnit(r: MarketRow): string {
  if (r.dollar) return 'دلار';
  if (r.key === 'g18' || r.key === 'g24') return 'تومان / هر گرم';
  return 'تومان';
}

function RatesBoard({
  rows,
  updatedAt,
  site,
}: {
  rows: MarketRow[];
  updatedAt?: string | null;
  site?: SiteSettings | null;
}) {
  const stale = isStale(updatedAt);
  const when = formatGoldTime(updatedAt);
  const home = site?.cms?.home;
  // LTR strip in the mock: featured ۱۸ عیار first on the left
  const ordered = useMemo(() => {
    const g18 = rows.find((r) => r.key === 'g18');
    const rest = rows.filter((r) => r.key !== 'g18');
    return g18 ? [g18, ...rest] : rows;
  }, [rows]);

  return (
    <section id="market" className="rates-board rates-handoff" aria-label="نرخ زنده بازار">
      <div className="container rates-board-inner">
        <div className="rates-scroll" tabIndex={0} aria-label="کارت‌های نرخ طلا و سکه">
          {ordered.map((r) => (
            <div key={r.key} className={`rate-chip${r.key === 'g18' ? ' featured' : ''}`}>
              {r.key === 'g18' ? <GoldBarsMark /> : null}
              <div className="rate-chip-body">
                <div className="rate-chip-label">{r.label}</div>
                <div className="rate-chip-value">
                  {r.dollar ? `$${faPrice(r.v)}` : faPrice(r.v)}
                </div>
                <div className="rate-chip-unit">{rateUnit(r)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="rates-board-status">
          <span className={`live-dot${stale ? ' is-stale' : ''}`} />
          {stale
            ? (home?.rates_stale || 'نرخ ممکن است به‌روز نباشد')
            : (home?.rates_live || 'به‌روزرسانی زنده قیمت‌ها')}
          {when ? ` | آخرین به‌روزرسانی: ${when}` : ''}
        </div>
      </div>
    </section>
  );
}

function useHeroSlides(site?: SiteSettings): { src: string; alt: string; caption: string; id: string }[] {
  return useMemo(() => {
    // Section 01 handoff: campaign artwork is the visual source of truth.
    // Keep CMS album available as secondary slides only when it differs.
    const handoff = {
      id: 'handoff-hero',
      src: HANDOFF_HERO,
      alt: 'گالری طلای آنیل',
      caption: '',
    };
    const album = (site?.hero_album || []).filter((s) => s.is_active !== false && s.image_url);
    const extras = album
      .map((s: HeroAlbumSlide) => ({
        id: String(s.id),
        src: s.image_url!,
        alt: s.alt_text || 'گالری طلای آنیل',
        caption: s.caption || '',
      }))
      .filter((s) => !s.src.includes('hero-gloved-hand') && !s.src.includes('anil-gallery'));
    return extras.length ? [handoff, ...extras] : [handoff];
  }, [site?.hero_album]);
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
      className="hero-painting hero-painting-handoff"
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
          {/* Campaign handoff art already includes ANIL / Gold Collection typography */}
        </div>
        {multi && (
          <>
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
  const badge = (site?.hero_badge || 'گالری طلای آنیل').replace(/^گالری طلا آنیل$/, 'گالری طلای آنیل');

  return (
    <section className="home-hero-bleed home-hero-handoff">
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
            <HeroCta to={primaryUrl} className="gold-btn hero-cta-primary">{primaryLabel}</HeroCta>
          </div>
        </div>
      </div>

      <div className="container home-hero d-hero">
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
            <HeroCta to={primaryUrl} className="gold-btn hero-cta-primary">
              {primaryLabel}
              <span className="hero-cta-chev" aria-hidden>‹</span>
            </HeroCta>
            <HeroCta to={secondaryUrl} className="outline-btn hero-cta-secondary">
              <span className="hero-cta-ico" aria-hidden><IconChart size={16} /></span>
              {secondaryLabel}
            </HeroCta>
          </div>
        </div>
        <HeroVisual
          site={site}
          slides={slides}
          index={index}
          onSelect={setIndex}
          paused={paused}
          onPause={setPaused}
        />
      </div>
    </section>
  );
}

function FeaturedHandoffCard({ product }: { product: Product }) {
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const addToCart = useStore((s) => s.addToCart);
  const user = useStore((s) => s.user);
  const tokens = useStore((s) => s.tokens);
  const openCart = useUI((s) => s.openCart);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();
  const loved = useFavorites((s) => s.has(product.id));
  const toggleFav = useFavorites((s) => s.toggle);

  const hasWeight =
    product.has_weight !== false && product.weight_g != null && Number(product.weight_g) > 0;
  const w = hasWeight ? Number(product.weight_g) : 0;
  const fee = Number(product.fee_ratio);
  const priced = hasWeight ? calcPrice(w, gp, fee, product.stone_value) : null;
  const total = priced?.total ?? null;
  const feeAmount = priced?.fee ?? null;
  const karat = product.karat || 18;

  const tryAdd = () => {
    if (!hasWeight) {
      toast('وزن این قطعه هنوز تأیید نشده؛ از مشاور هوشمند کمک بگیرید یا با گالری تماس بگیرید.');
      return;
    }
    if (!tokens || !user) {
      toast('برای افزودن به سبد ابتدا وارد شوید یا ثبت‌نام کنید.');
      nav('/register');
      return;
    }
    if (!isProfileReady(user)) {
      toast(profileGapMessage(user));
      nav(profileCompletePath());
      return;
    }
    addToCart(product.id);
    toast(`«${product.name}» به سبد افزوده شد`);
    openCart();
  };

  return (
    <article className="fh-card">
      <div className="fh-card-media">
        <Link to={`/products/${product.slug}`} className="fh-card-img-link" tabIndex={-1}>
          {product.primary_image ? (
            <img
              src={product.primary_image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              width={480}
              height={480}
            />
          ) : (
            <span className="fh-card-fallback">{product.placeholder_label || product.category_name}</span>
          )}
        </Link>
        <button
          type="button"
          className={`fh-card-fav${loved ? ' is-on' : ''}`}
          aria-label={loved ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          aria-pressed={loved}
          onClick={() => {
            const on = toggleFav(product.id);
            toast(on ? 'به علاقه‌مندی‌ها افزوده شد' : 'از علاقه‌مندی‌ها حذف شد');
          }}
        >
          <IconHeart size={16} filled={loved} />
        </button>
      </div>
      <div className="fh-card-body">
        <Link to={`/products/${product.slug}`} className="fh-card-name">{product.name}</Link>
        <div className="fh-card-meta">
          وزن: {hasWeight ? `${faNum(w)} گرم` : 'پس از تأیید'} · عیار {faNum(karat)}
        </div>
        <div className="fh-card-meta">
          اجرت: {feeAmount != null ? `${faPrice(feeAmount)} تومان` : '—'}
        </div>
        <div className="fh-card-price">{total != null ? faPrice(total) : '—'}</div>
        <div className="fh-card-unit">{total != null ? 'تومان' : 'قیمت پس از تأیید وزن'}</div>
        <div className="fh-card-actions">
          <button
            type="button"
            className="fh-card-cart"
            aria-label="افزودن به سبد"
            onClick={tryAdd}
            disabled={!hasWeight}
          >
            <IconShoppingBag size={16} />
          </button>
          <Link to={`/products/${product.slug}`} className="fh-card-view">مشاهده جزئیات</Link>
        </div>
      </div>
    </article>
  );
}

function FeaturedRail({
  products,
  site,
}: {
  products: Product[];
  site?: SiteSettings | null;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const home = site?.cms?.home;
  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const step = Math.min(280, el.clientWidth * 0.85);
    el.scrollBy({ left: dir * -step, behavior: 'smooth' });
  };

  if (!products.length) return null;
  const row = products.slice(0, 4);

  return (
    <section className="container section-pad home-featured handoff-02-featured">
      <div className="section-row handoff-02-head">
        <div className="handoff-02-head-main">
          <div>
            <h2 className="section-title tight">{home?.featured_title || 'منتخب محصولات'}</h2>
            <p className="section-sub">{home?.featured_subtitle || 'جدیدترین و محبوب‌ترین زیورآلات آنیل'}</p>
          </div>
          <div className="rail-nav" role="group" aria-label="جابه‌جایی محصولات">
            <button type="button" className="rail-nav-btn" aria-label="قبلی" onClick={() => scrollBy(-1)}>
              ‹
            </button>
            <button type="button" className="rail-nav-btn" aria-label="بعدی" onClick={() => scrollBy(1)}>
              ›
            </button>
          </div>
        </div>
        <Link to="/products" className="outline-btn section-all-btn handoff-02-all">
          {home?.featured_all || 'مشاهده همه'}
          <span aria-hidden>‹</span>
        </Link>
      </div>
      <div className="product-rail handoff-02-rail handoff-02-grid-mobile" ref={scroller}>
        {row.map((p) => (
          <div key={p.id} className="product-rail-item">
            <FeaturedHandoffCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

const CATEGORY_ORDER = [/انگشتر|سولیتر/, /گردن|زنجیر/, /دستبند|النگو/, /گوشواره/, /سکه|شمش/, /نیم.?ست|نیمست/];

function CategoriesSection({
  categories,
  site,
}: {
  categories: Category[];
  site?: SiteSettings | null;
}) {
  if (!categories.length) return null;
  const home = site?.cms?.home;
  const ordered = [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.findIndex((re) => re.test(`${a.name} ${a.slug}`));
    const bi = CATEGORY_ORDER.findIndex((re) => re.test(`${b.name} ${b.slug}`));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  }).slice(0, 6);

  return (
    <section className="container section-pad home-categories handoff-02-categories">
      <div className="section-row handoff-02-head">
        <div>
          <h2 className="section-title tight">{home?.categories_title || 'دسته‌بندی محصولات'}</h2>
          <p className="section-sub">{home?.categories_subtitle || 'دسته‌بندی مورد علاقه خود را انتخاب کنید'}</p>
        </div>
        <Link to="/products" className="outline-btn section-all-btn handoff-02-all">
          {home?.categories_all || 'مشاهده همه'}
        </Link>
      </div>
      <div className="cat-rail handoff-02-cats handoff-02-cats-grid" aria-label="دسته‌بندی‌ها">
        {ordered.map((c) => {
          const art = categoryArt(c);
          return (
            <Link key={c.id} to={`/products?category=${encodeURIComponent(c.slug)}`} className="cat-tile handoff-02-cat">
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
                <span className="cat-tile-link">{home?.category_cta || 'مشاهده محصولات'} <span aria-hidden>‹</span></span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CollectionBanner({
  categories,
  site,
}: {
  categories: Category[];
  site?: SiteSettings | null;
}) {
  const cms = site?.cms?.collection;
  const target =
    categories.find((c) => /نیم.?ست|سرویس|گردن/.test(`${c.name}${c.slug}`)) || categories[0];
  const to =
    cms?.cta_url ||
    (target ? `/products?category=${encodeURIComponent(target.slug)}` : '/products');
  const img =
    mediaUrl(site?.collection_image_url || '') ||
    cms?.image_path ||
    '/home/collection-banner.webp';

  return (
    <section className="container home-collection handoff-03-collection">
      <div
        className="handoff-03-banner"
        style={{ backgroundImage: `url('${img}')` }}
      >
        <div className="handoff-03-banner-copy">
          <h2>{cms?.title || 'مجموعه‌ای از زیبایی ماندگار'}</h2>
          <p>{cms?.subtitle || 'طراحی‌های خاص، مناسب لحظه‌های مهم زندگی شما'}</p>
          <Link to={to} className="handoff-03-cta">
            <span className="handoff-03-cta-chev" aria-hidden>‹</span>
            {cms?.cta_label || 'مشاهده کلکسیون'}
          </Link>
        </div>
      </div>
    </section>
  );
}

function liveGramRate(gold: GoldPrice | null | undefined, karat: '18' | '24'): number {
  const key = karat === '24' ? 'g24' : 'g18';
  const fromRow = gold?.market_rows?.find((r) => r.key === key)?.v;
  if (typeof fromRow === 'number' && fromRow > 0) return fromRow;
  const fallback = karat === '24' ? gold?.price_24k_per_gram : gold?.price_18k_per_gram;
  return typeof fallback === 'number' && fallback > 0 ? fallback : 0;
}

function HomeGoldCalculator({ site }: { site?: SiteSettings | null }) {
  const gold = useStore((s) => s.goldPrice);
  const home = site?.cms?.home;
  const rate18 = liveGramRate(gold, '18');
  const rate24 = liveGramRate(gold, '24');
  const [weightRaw, setWeightRaw] = useState('۱۰');
  const [karat, setKarat] = useState<'18' | '24'>('18');
  const weightId = useId();
  const karatId = useId();

  const weight = useMemo(() => parseWeightGrams(weightRaw), [weightRaw]);

  const rate = karat === '24' ? rate24 : rate18;
  // True live gold value only (weight × rate) — no sample fee/profit/tax.
  const estimate = rate > 0 && weight > 0 ? Math.round(weight * rate) : 0;
  const hint =
    rate > 0
      ? `برآورد ارزش طلای خام با نرخ زنده ${karat === '24' ? '۲۴' : '۱۸'} عیار؛ قیمت نهایی قطعه با اجرت و سود جدا محاسبه می‌شود.`
      : 'در حال دریافت نرخ زنده طلا…';

  return (
    <section
      className="container home-calculator handoff-03-calc"
      aria-labelledby="home-calc-title"
    >
      <div className="handoff-03-head">
        <h2 id="home-calc-title">{home?.calculator_title || 'محاسبه قیمت آنلاین طلا'}</h2>
        <p>{home?.calculator_subtitle || 'به‌سادگی وزن و عیار را وارد کنید تا قیمت تقریبی را مشاهده نمایید.'}</p>
      </div>
      {/* RTL: weight (right) → karat → result (left) */}
      <div className="handoff-03-calc-grid">
        <label className="handoff-03-calc-card" htmlFor={weightId}>
          <span className="handoff-03-calc-label">{home?.calculator_weight_label || 'وزن (گرم)'}</span>
          <span className="handoff-03-calc-row">
            <span className="handoff-03-calc-ico" aria-hidden><IconScale size={20} /></span>
            <input
              id={weightId}
              inputMode="decimal"
              className="handoff-03-calc-control"
              value={weightRaw}
              onChange={(e) => {
                let s = String(e.target.value)
                  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
                  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
                  .replace(/,/g, '.')
                  .replace(/[^\d.]/g, '');
                const firstDot = s.indexOf('.');
                if (firstDot !== -1) {
                  s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
                  const [whole, frac = ''] = s.split('.');
                  s = `${whole}.${frac.slice(0, WEIGHT_DECIMALS)}`;
                }
                setWeightRaw(s);
              }}
              aria-describedby="home-calc-hint"
              placeholder="مثلاً 4.125"
            />
          </span>
        </label>
        <label className="handoff-03-calc-card" htmlFor={karatId}>
          <span className="handoff-03-calc-label">{home?.calculator_karat_label || 'عیار طلا'}</span>
          <span className="handoff-03-calc-row">
            <span className="handoff-03-calc-ico" aria-hidden><IconLayers size={20} /></span>
            <select
              id={karatId}
              className="handoff-03-calc-control"
              value={karat}
              onChange={(e) => setKarat(e.target.value as '18' | '24')}
            >
              <option value="18">۱۸ عیار</option>
              <option value="24">۲۴ عیار</option>
            </select>
          </span>
        </label>
        <div className="handoff-03-calc-card handoff-03-calc-result" aria-live="polite">
          <span className="handoff-03-calc-label">{home?.calculator_result_label || 'قیمت تقریبی'}</span>
          <span className="handoff-03-calc-row">
            <span className="handoff-03-calc-ico" aria-hidden><IconCalc size={20} /></span>
            <span className="handoff-03-calc-result-body">
              <span className="handoff-03-calc-value">
                {rate > 0 && weight > 0 ? faPrice(estimate) : '—'}
              </span>
              <span className="handoff-03-calc-unit">تومان</span>
            </span>
          </span>
        </div>
      </div>
      <p id="home-calc-hint" className="sr-only">{hint}</p>
    </section>
  );
}

const WHY_ICONS = [IconChart, IconInvoice, IconShieldCheck, IconInsuredShip] as const;

function WhyAnil({
  heading,
  site,
}: {
  heading?: string;
  site?: SiteSettings | null;
}) {
  const cms = site?.cms?.why_anil;
  const items = (cms?.items?.length
    ? cms.items
    : [
        { title: 'قیمت لحظه‌ای', body: 'نرخ روز طلا به‌صورت زنده روی سایت به‌روز می‌شود.' },
        { title: 'عیار ۱۸', body: 'قطعات گالری بر پایه طلای ۱۸ عیار قیمت‌گذاری می‌شوند.' },
        { title: 'مشاوره حضوری', body: 'در ابهر کنار شما هستیم تا انتخاب مطمئن داشته باشید.' },
        { title: 'خرید شفاف', body: 'وزن، اجرت و جزئیات قیمت قبل از سفارش مشخص است.' },
      ]
  ).map((item, i) => ({
    ...item,
    Icon: WHY_ICONS[i % WHY_ICONS.length],
    key: `why-${i}`,
  }));

  return (
    <section className="container home-why handoff-03-why">
      <div className="handoff-03-why-glow" aria-hidden />
      <div className="handoff-03-head">
        <h2>{heading || site?.trust_heading || 'چرا آنیل؟'}</h2>
        <p>{cms?.subtitle || 'شفافیت قیمت، کیفیت ساخت، و همراهی واقعی برای انتخاب درست.'}</p>
      </div>
      <div className="handoff-03-why-grid">
        {items.map((t) => (
          <div key={t.key} className="handoff-03-why-card">
            <div className="handoff-03-why-ico" aria-hidden>
              <t.Icon size={20} />
            </div>
            <div className="handoff-03-why-title">{t.title}</div>
            <div className="handoff-03-why-desc">{t.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorialStrip({ site }: { site?: SiteSettings | null }) {
  const cms = site?.cms?.editorial;
  const img =
    mediaUrl(site?.editorial_image_url || '') ||
    cms?.image_path ||
    '/home/editorial-triptych.webp';

  return (
    <section className="container home-editorial handoff-04-editorial">
      <div
        className="handoff-04-editorial-banner"
        style={{ backgroundImage: `url('${img}')` }}
      >
        <div className="handoff-04-editorial-copy">
          <h2>{cms?.title || 'نگاهی نزدیک‌تر به جزئیات'}</h2>
          <p>{cms?.subtitle || 'قطعات منتخب گالری را در کاتالوگ ببینید'}</p>
          <Link to={cms?.cta_url || '/products'} className="handoff-03-cta">
            <span className="handoff-03-cta-chev" aria-hidden>‹</span>
            {cms?.cta_label || 'ورود به گالری'}
          </Link>
        </div>
      </div>
    </section>
  );
}

function LatestBlogStrip({ posts }: { posts: ContentPage[] }) {
  const list = posts.filter((p) => p.slug !== 'بلاگ').slice(0, 2);
  if (!list.length) return null;
  return (
    <section className="container section-pad home-blog-strip" aria-labelledby="home-blog-title">
      <div className="section-row handoff-02-head">
        <div>
          <h2 id="home-blog-title" className="section-title tight">آخرین مطالب مجله</h2>
          <p className="section-sub">راهنمای خرید و نکات طلا از مجله آنیل</p>
        </div>
        <Link to="/blog" className="outline-btn section-all-btn handoff-02-all">
          مشاهده همه
          <span aria-hidden>‹</span>
        </Link>
      </div>
      <div className="home-blog-grid">
        {list.map((p) => (
          <article key={p.id} className="home-blog-card">
            <Link to={`/blog/${p.slug}`} className="home-blog-cover" tabIndex={-1}>
              {p.cover_url ? (
                <img src={mediaUrl(p.cover_url)} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="home-blog-fallback">ANIL</span>
              )}
            </Link>
            <div className="home-blog-body">
              {p.tags?.[0] ? <span className="home-blog-tag">{p.tags[0]}</span> : null}
              <h3>
                <Link to={`/blog/${p.slug}`}>{p.title}</Link>
              </h3>
              {p.excerpt ? <p>{p.excerpt}</p> : null}
            </div>
          </article>
        ))}
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
  const { data: blogPosts = [] } = useQuery({
    queryKey: ['blog-pages-home'],
    queryFn: () => api.pages({ type: 'blog' }).then((r) => r.data),
    staleTime: 60_000,
  });

  const categories = categoriesData ?? [];
  const products = productsData ?? [];
  const featured = useMemo(() => {
    const flagged = products.filter((p) => p.is_featured && p.primary_image);
    const rest = products.filter((p) => !flagged.some((f) => f.id === p.id) && p.primary_image);
    return [...flagged, ...rest].slice(0, 4);
  }, [products]);

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
          site={site}
        />
      ) : site?.show_rates !== false ? (
        <section key="rates-empty" id="market" className="rates-board rates-board-empty">
          <div className="container">
            <div className="rates-board-status">
              <span className="live-dot is-stale" />
              {site?.cms?.home?.rates_empty || 'نرخ طلا در دسترس نیست — کمی بعد دوباره تلاش کنید'}
            </div>
          </div>
        </section>
      ) : null,
    featured:
      site?.show_featured !== false ? (
        <FeaturedRail key="featured" products={featured} site={site} />
      ) : null,
    categories:
      site?.show_categories !== false ? (
        <CategoriesSection key="categories" categories={categories} site={site} />
      ) : null,
    collection: <CollectionBanner key="collection" categories={categories} site={site} />,
    calculator: <HomeGoldCalculator key="calculator" site={site} />,
    trust:
      site?.show_trust !== false ? (
        <WhyAnil key="trust" heading={site?.trust_heading} site={site} />
      ) : null,
    editorial: <EditorialStrip key="editorial" site={site} />,
    blog: <LatestBlogStrip key="blog" posts={blogPosts} />,
    contact: <ContactBand key="contact" site={site} title="بازدید و تماس" />,
  };

  return (
    <div className="home">
      {order.map((key) => sections[key]).filter(Boolean)}
      <SiteFooter site={site} categories={categories} />
    </div>
  );
}
