import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { ProductImageGallery } from '../components/ProductImageGallery';
import { SecondaryPageChrome } from '../components/SiteChrome';
import { IconHeart, IconShoppingBag } from '../components/icons';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { useUI } from '../store/uiStore';
import { calcPrice, faFeePct, faNum, faPrice } from '../utils/format';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';

function formatGoldStamp(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const gold = useStore((s) => s.goldPrice);
  const gp = gold?.price_18k_per_gram ?? 0;
  const addToCart = useStore((s) => s.addToCart);
  const user = useStore((s) => s.user);
  const tokens = useStore((s) => s.tokens);
  const openCart = useUI((s) => s.openCart);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [loved, setLoved] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const [tab, setTab] = useState<'desc' | 'specs'>('desc');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.product(slug!).then((r) => r.data),
    enabled: !!slug,
  });

  const { data: related } = useQuery({
    queryKey: ['products', product?.category_slug, 'related'],
    queryFn: () =>
      api.products({ category: product!.category_slug, page_size: '8' }).then((r) =>
        r.data.results.filter((p) => p.slug !== slug).slice(0, 4),
      ),
    enabled: !!product,
  });

  useEffect(() => {
    if (product?.id) {
      let sessionId = '';
      try {
        sessionId = sessionStorage.getItem('anil_vid') || '';
      } catch {
        sessionId = '';
      }
      api
        .logProductView(product.id, {
          path: `/products/${product.slug}`,
          title: document.title,
          referrer: document.referrer || '',
          session_id: sessionId,
          user_agent: navigator.userAgent,
        })
        .catch(() => {});
    }
  }, [product?.id, product?.slug]);

  useEffect(() => {
    setQty(1);
    setLoved(false);
    setTab('desc');
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    const title = product.meta_title || `${product.name} | گالری طلا آنیل`;
    const description = product.meta_description
      || `${product.name}${product.category_name ? ` — ${product.category_name}` : ''} با قیمت لحظه‌ای طلا از گالری طلا آنیل.`;
    document.title = title;

    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    ensureMeta('description', description);
    ensureMeta('keywords', [product.name, product.category_name, 'طلا', 'گالری طلا آنیل'].filter(Boolean).join('، '));

    return () => {
      document.title = 'گالری طلا آنیل | Anil Gold';
    };
  }, [product]);

  const images = useMemo(() => {
    const raw = product?.images?.length
      ? [...product.images].sort((a, b) => {
          if (!!a.is_primary === !!b.is_primary) return (a.order ?? 0) - (b.order ?? 0);
          return a.is_primary ? -1 : 1;
        })
      : [];
    const urls = raw
      .map((i) => i.image_url || i.image || '')
      .filter(Boolean) as string[];
    if (urls.length) return urls;
    return product?.primary_image ? [product.primary_image] : [];
  }, [product]);

  if (isLoading || !product) {
    return (
      <div className="container" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
        در حال بارگذاری…
      </div>
    );
  }

  const hasWeight = product.has_weight !== false && product.weight_g != null && Number(product.weight_g) > 0;
  const w = hasWeight ? Number(product.weight_g) : 0;
  const fee = Number(product.fee_ratio);
  const bd = hasWeight ? (product.breakdown || calcPrice(w, gp, fee, product.stone_value)) : null;
  const inStock = product.in_stock !== false && (product.stock ?? 1) > 0;
  const maxQty = Math.max(1, product.stock ?? 99);
  const stamp = formatGoldStamp(gold?.created_at);
  const karat = product.karat || 18;

  const addToBox = () => {
    if (!hasWeight) {
      toast('تا تأیید وزن، امکان افزودن به سبد نیست.');
      return;
    }
    if (!tokens || !user) {
      toast('برای افزودن به گلد باکس ابتدا وارد شوید یا ثبت‌نام کنید.');
      nav('/register');
      return;
    }
    if (!isProfileReady(user)) {
      toast(profileGapMessage(user));
      nav(profileCompletePath());
      return;
    }
    addToCart(product.id, qty);
    toast(`«${product.name}» به گلد باکس افزوده شد`);
    openCart();
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
    } catch {
      /* user cancelled */
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('لینک محصول کپی شد');
    } catch {
      toast('امکان اشتراک‌گذاری در این مرورگر نیست');
    }
  };

  return (
    <SecondaryPageChrome>
      <section className="container product-detail-page handoff-pd">
        <nav className="pd-breadcrumb" aria-label="مسیر صفحه">
          <Link to="/">خانه</Link>
          <span aria-hidden>›</span>
          <Link to="/products">محصولات</Link>
          <span aria-hidden>›</span>
          <Link to={`/products?category=${product.category_slug}`}>{product.category_name}</Link>
          <span aria-hidden>›</span>
          <span className="current">{product.name}</span>
        </nav>

        <div className="pd-grid">
          <ProductImageGallery
            images={images}
            alt={product.name}
            placeholder={product.placeholder_label || product.name}
            outOfStock={!inStock}
          />

          <div className="pd-info">
            <div className="pd-tags">
              <span className="pd-cat">{product.category_name}</span>
              {product.tag && <span className="pd-tag">{product.tag}</span>}
              {product.is_featured && <span className="pd-tag">ویژه</span>}
            </div>
            <h1>{product.name}</h1>
            {product.description && <p className="pd-desc">{product.description}</p>}

            <div className="handoff-pd-price-card">
              <div className="handoff-pd-live">
                <span className={`live-dot${bd ? '' : ' is-stale'}`} />
                <span>{bd ? 'قیمت به‌روز محصول' : 'در انتظار تأیید وزن'}</span>
                {stamp ? <time dateTime={gold?.created_at}>{stamp}</time> : null}
              </div>
              <div className="pd-price-row">
                <div className="pd-price">
                  {bd ? (
                    <>
                      {faPrice(bd.total)} <small>تومان</small>
                    </>
                  ) : (
                    <>وزن و قیمت پس از تأیید</>
                  )}
                </div>
              </div>

              {bd ? (
                <div className={`pd-breakdown${breakdownOpen ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="pd-breakdown-title"
                    aria-expanded={breakdownOpen}
                    onClick={() => setBreakdownOpen((v) => !v)}
                  >
                    تفکیک قیمت
                    <span aria-hidden>{breakdownOpen ? '▴' : '▾'}</span>
                  </button>
                  {breakdownOpen ? (
                    <div className="pd-breakdown-body">
                      <div className="pd-breakdown-row">
                        <span>ارزش طلا ({faNum(w)} گرم × نرخ روز)</span>
                        <span>{faPrice(bd.gold)}</span>
                      </div>
                      <div className="pd-breakdown-row">
                        <span>اجرت ساخت (٪{faFeePct(fee)})</span>
                        <span>{faPrice(bd.fee)}</span>
                      </div>
                      {bd.stone > 0 && (
                        <div className="pd-breakdown-row">
                          <span>سنگ و نگین</span>
                          <span>{faPrice(bd.stone)}</span>
                        </div>
                      )}
                      <div className="pd-breakdown-row">
                        <span>مالیات ارزش افزوده ۹٪</span>
                        <span>{faPrice(bd.tax)}</span>
                      </div>
                      <div className="pd-breakdown-total">
                        <span>قیمت نهایی</span>
                        <span>{faPrice(bd.total)} تومان</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="pd-breakdown is-open">
                  <div className="pd-breakdown-title static">وزن و قیمت</div>
                  <p className="pd-desc" style={{ margin: 0 }}>
                    وزن این قطعه در حال بازبینی است. از «مشاور هوشمند» بخواهید مشابه آن را پیدا کند،
                    یا برای اعلام وزن دقیق با گالری تماس بگیرید.
                  </p>
                </div>
              )}
            </div>

            <div className="pd-specs handoff-pd-specs">
              {[
                [hasWeight ? `${faNum(w)} گرم` : 'پس از تأیید', 'وزن'],
                [`${faNum(karat)} عیار`, 'عیار'],
                [inStock ? 'موجود' : 'ناموجود', 'وضعیت'],
                [faNum(product.stock ?? 0), 'موجودی'],
              ].map(([v, l]) => (
                <div key={l} className="pd-spec">
                  <div className={`pd-spec-v${l === 'وضعیت' && inStock ? ' is-up' : ''}`}>{v}</div>
                  <div className="pd-spec-l">{l}</div>
                </div>
              ))}
            </div>

            <div className="pd-actions handoff-pd-actions">
              <div className="pd-qty">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="کاهش تعداد">−</button>
                <div>{faNum(qty)}</div>
                <button type="button" onClick={() => setQty(Math.min(maxQty, qty + 1))} aria-label="افزایش تعداد">+</button>
              </div>
              <button
                type="button"
                className="gold-btn handoff-pd-primary"
                disabled={!inStock || !hasWeight}
                onClick={addToBox}
              >
                <IconShoppingBag size={18} />
                {!hasWeight ? 'منتظر تأیید وزن' : inStock ? 'افزودن به گلد باکس' : 'ناموجود'}
              </button>
            </div>

            <div className="handoff-pd-secondary">
              <button
                type="button"
                className={`outline-btn${loved ? ' is-on' : ''}`}
                aria-pressed={loved}
                onClick={() => setLoved((v) => !v)}
              >
                <IconHeart size={16} filled={loved} />
                علاقه‌مندی
              </button>
              <button type="button" className="outline-btn" onClick={share}>
                اشتراک‌گذاری
              </button>
            </div>
          </div>
        </div>

        <section className="handoff-pd-tabs" aria-label="جزئیات محصول">
          <div className="handoff-pd-tablist" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'desc'}
              className={tab === 'desc' ? 'is-active' : ''}
              onClick={() => setTab('desc')}
            >
              توضیحات محصول
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'specs'}
              className={tab === 'specs' ? 'is-active' : ''}
              onClick={() => setTab('specs')}
            >
              مشخصات فنی
            </button>
          </div>
          <div className="handoff-pd-tabpanel" role="tabpanel">
            {tab === 'desc' ? (
              <p>
                {product.description?.trim() ||
                  `${product.name} از دسته ${product.category_name} — با قیمت‌گذاری لحظه‌ای بر پایه نرخ روز طلا در گالری آنیل.`}
              </p>
            ) : (
              <ul className="handoff-pd-spec-list">
                <li><span>نام</span><b>{product.name}</b></li>
                <li><span>دسته‌بندی</span><b>{product.category_name}</b></li>
                <li><span>عیار</span><b>{faNum(karat)}</b></li>
                <li><span>وزن</span><b>{hasWeight ? `${faNum(w)} گرم` : 'پس از تأیید'}</b></li>
                {hasWeight ? (
                  <li><span>اجرت</span><b>٪{faFeePct(fee)}</b></li>
                ) : null}
                <li><span>وضعیت</span><b>{inStock ? 'موجود' : 'ناموجود'}</b></li>
              </ul>
            )}
          </div>
        </section>

        {related && related.length > 0 && (
          <div className="pd-related">
            <div className="handoff-pd-related-head">
              <h2>محصولات مشابه</h2>
              <Link to={`/products?category=${product.category_slug}`} className="outline-btn">
                مشاهده همه
              </Link>
            </div>
            <div className="product-grid cols-4 handoff-products-grid">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </section>
    </SecondaryPageChrome>
  );
}
