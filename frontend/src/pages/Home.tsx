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
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { useUI } from '../store/uiStore';
import { calcPrice, faNum, faPrice } from '../utils/format';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';
import type { Category, HeroAlbumSlide, MarketRow, Product, SiteSettings } from '../types';

/** Heavy WebGL — only imported after the user opts in (never during first paint). */
const loadHeroRing3D = () =>
  import('../components/HeroRing3D').then((m) => ({ default: m.HeroRing3D }));
const HeroRing3D = lazy(loadHeroRing3D);

/** Handoff section-01 campaign artwork — used for the homepage hero painting. */
const HANDOFF_HERO = '/home/hero-gloved-hand.webp';

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
}: {
  rows: MarketRow[];
  updatedAt?: string | null;
}) {
  const stale = isStale(updatedAt);
  const when = formatGoldTime(updatedAt);
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
          {stale ? 'نرخ ممکن است به‌روز نباشد' : 'به‌روزرسانی زنده قیمت‌ها'}
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
  const [loved, setLoved] = useState(false);

  const hasWeight =
    product.has_weight !== false && product.weight_g != null && Number(product.weight_g) > 0;
  const w = hasWeight ? Number(product.weight_g) : 0;
  const fee = Number(product.fee_ratio);
  const total = hasWeight ? calcPrice(w, gp, fee, product.stone_value).total : null;
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
          onClick={() => setLoved((v) => !v)}
        >
          <IconHeart size={16} filled={loved} />
        </button>
      </div>
      <div className="fh-card-body">
        <Link to={`/products/${product.slug}`} className="fh-card-name">{product.name}</Link>
        <div className="fh-card-meta">طلای {faNum(karat)} عیار</div>
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
          <Link to={`/products/${product.slug}`} className="fh-card-view">مشاهده محصول</Link>
        </div>
      </div>
    </article>
  );
}

function FeaturedRail({ products }: { products: Product[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const step = Math.min(280, el.clientWidth * 0.85);
    el.scrollBy({ left: dir * -step, behavior: 'smooth' });
  };

  if (!products.length) return null;
  const row = products.slice(0, 5);

  return (
    <section className="container section-pad home-featured handoff-02-featured">
      <div className="section-row handoff-02-head">
        <div className="handoff-02-head-main">
          <div>
            <h2 className="section-title tight">محصولات منتخب</h2>
            <p className="section-sub">جدیدترین و محبوب‌ترین زیورآلات آنیل</p>
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
          مشاهده همه
          <span aria-hidden>‹</span>
        </Link>
      </div>
      <div className="product-rail handoff-02-rail" ref={scroller}>
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

function CategoriesSection({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  const ordered = [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.findIndex((re) => re.test(`${a.name} ${a.slug}`));
    const bi = CATEGORY_ORDER.findIndex((re) => re.test(`${b.name} ${b.slug}`));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  }).slice(0, 5);

  return (
    <section className="container section-pad home-categories handoff-02-categories">
      <div className="section-row handoff-02-head">
        <div>
          <h2 className="section-title tight">دسته‌بندی محصولات</h2>
          <p className="section-sub">دسته‌بندی مورد علاقه خود را انتخاب کنید</p>
        </div>
        <Link to="/products" className="outline-btn section-all-btn handoff-02-all">
          مشاهده همه دسته‌ها
        </Link>
      </div>
      <div className="cat-rail handoff-02-cats" aria-label="دسته‌بندی‌ها">
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
                <span className="cat-tile-link">مشاهده محصولات <span aria-hidden>‹</span></span>
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
    <section className="container home-collection handoff-03-collection">
      <div
        className="handoff-03-banner"
        style={{ backgroundImage: "url('/home/collection-banner.webp')" }}
      >
        <div className="handoff-03-banner-copy">
          <h2>مجموعه‌ای از زیبایی ماندگار</h2>
          <p>طراحی‌های خاص، مناسب لحظه‌های مهم زندگی شما</p>
          <Link to={to} className="handoff-03-cta">
            <span className="handoff-03-cta-chev" aria-hidden>‹</span>
            مشاهده کلکسیون
          </Link>
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
  const feeRatio = 0.12;
  const estimate = rate > 0 && weight > 0 ? calcPrice(weight, rate, feeRatio, 0).total : 0;
  const hint =
    rate > 0
      ? `برآورد تقریبی با نرخ ${karat === '24' ? '۲۴' : '۱۸'} عیار و اجرت نمونه ۱۲٪؛ مبلغ نهایی قطعه پس از اجرت واقعی مشخص می‌شود.`
      : 'در حال دریافت نرخ زنده طلا…';

  return (
    <section
      className="container home-calculator handoff-03-calc"
      aria-labelledby="home-calc-title"
    >
      <div className="handoff-03-head">
        <h2 id="home-calc-title">محاسبه قیمت آنلاین طلا</h2>
        <p>به‌سادگی وزن و عیار را وارد کنید تا قیمت تقریبی را مشاهده نمایید.</p>
      </div>
      {/* RTL: weight (right) → karat → result (left) */}
      <div className="handoff-03-calc-grid">
        <label className="handoff-03-calc-card" htmlFor={weightId}>
          <span className="handoff-03-calc-label">وزن (گرم)</span>
          <span className="handoff-03-calc-row">
            <span className="handoff-03-calc-ico" aria-hidden><IconScale size={20} /></span>
            <input
              id={weightId}
              inputMode="decimal"
              className="handoff-03-calc-control"
              value={weightRaw}
              onChange={(e) => setWeightRaw(e.target.value)}
              aria-describedby="home-calc-hint"
            />
          </span>
        </label>
        <label className="handoff-03-calc-card" htmlFor={karatId}>
          <span className="handoff-03-calc-label">عیار طلا</span>
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
          <span className="handoff-03-calc-label">قیمت تقریبی</span>
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

function WhyAnil({ heading: _heading }: { heading?: string }) {
  const items = [
    { key: 'live', title: 'قیمت‌گذاری لحظه‌ای', desc: 'بر پایه نرخ روز طلا', Icon: IconChart },
    { key: 'invoice', title: 'فاکتور رسمی', desc: 'همراه با جزئیات خرید', Icon: IconInvoice },
    { key: 'secure', title: 'خرید امن و مطمئن', desc: 'با بسته‌بندی استاندارد', Icon: IconShieldCheck },
    { key: 'ship', title: 'ارسال سریع و بیمه‌شده', desc: 'به سراسر کشور', Icon: IconInsuredShip },
  ];

  return (
    <section className="container home-why handoff-03-why">
      <div className="handoff-03-why-glow" aria-hidden />
      <div className="handoff-03-head">
        <h2>چرا از آنیل خرید کنیم؟</h2>
        <p>تجربه‌ای مطمئن، شفاف و لذت‌بخش از خرید طلا</p>
      </div>
      <div className="handoff-03-why-grid">
        {items.map((t) => (
          <div key={t.key} className="handoff-03-why-card">
            <div className="handoff-03-why-ico" aria-hidden>
              <t.Icon size={20} />
            </div>
            <div className="handoff-03-why-title">{t.title}</div>
            <div className="handoff-03-why-desc">{t.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorialStrip() {
  return (
    <section className="container home-editorial handoff-04-editorial">
      <div
        className="handoff-04-editorial-banner"
        style={{ backgroundImage: "url('/home/editorial-triptych.webp')" }}
      >
        <div className="handoff-04-editorial-copy">
          <h2>نگاهی نزدیک‌تر به جزئیات</h2>
          <p>قطعات منتخب گالری را در کاتالوگ ببینید</p>
          <Link to="/products" className="handoff-03-cta">
            <span className="handoff-03-cta-chev" aria-hidden>‹</span>
            ورود به گالری
          </Link>
        </div>
      </div>
    </section>
  );
}

function ContactBand({ site }: { site?: SiteSettings }) {
  const address = contactAddress(site);
  const phone = contactPhone(site);
  const email = contactEmail(site);
  // Placeholder map centered on Abhar — exact pin can be updated later.
  const mapSrc =
    'https://maps.google.com/maps?q=' +
    encodeURIComponent('ابهر، استان زنجان') +
    '&hl=fa&z=14&output=embed';

  return (
    <section id="contact" className="container home-contact handoff-04-contact" aria-labelledby="home-contact-title">
      <div className="handoff-04-contact-grid">
        <div className="handoff-04-map-wrap">
          <iframe
            className="handoff-04-map"
            title="موقعیت گالری آنیل روی نقشه"
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="handoff-04-contact-copy">
          <h2 id="home-contact-title">بازدید و تماس</h2>
          <p className="handoff-04-contact-lead">گالری طلای آنیل — ابهر</p>
          <ul className="handoff-04-contact-list">
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
          <div className="handoff-04-contact-actions">
            <a className="gold-btn" href={`mailto:${email}`}>ارسال ایمیل</a>
            <a
              className="outline-btn"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              باز کردن در نقشه
            </a>
          </div>
          <p className="handoff-04-contact-note">موقعیت دقیق فروشگاه به‌زودی روی نقشه به‌روزرسانی می‌شود.</p>
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
  const featured = useMemo(() => {
    const flagged = products.filter((p) => p.is_featured && p.primary_image);
    const rest = products.filter((p) => !flagged.some((f) => f.id === p.id) && p.primary_image);
    return [...flagged, ...rest].slice(0, 5);
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
