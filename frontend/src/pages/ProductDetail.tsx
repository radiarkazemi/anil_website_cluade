import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { ReserveModal } from '../components/ReserveModal';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { useUI } from '../store/uiStore';
import { calcPrice, faNum, faPrice } from '../utils/format';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const addToCart = useStore((s) => s.addToCart);
  const user = useStore((s) => s.user);
  const tokens = useStore((s) => s.tokens);
  const openCart = useUI((s) => s.openCart);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [reserveOpen, setReserveOpen] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.product(slug!).then((r) => r.data),
    enabled: !!slug,
  });

  const { data: related } = useQuery({
    queryKey: ['products', product?.category_slug],
    queryFn: () =>
      api.products({ category: product!.category_slug, page_size: '5' }).then((r) =>
        r.data.results.filter((p) => p.slug !== slug).slice(0, 4),
      ),
    enabled: !!product,
  });

  useEffect(() => {
    if (product?.id) {
      api.logProductView(product.id).catch(() => {});
    }
  }, [product?.id]);

  useEffect(() => {
    setImgIdx(0);
    setQty(1);
    setReserveOpen(false);
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

  if (isLoading || !product) {
    return (
      <div className="container" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
        در حال بارگذاری…
      </div>
    );
  }

  const hasWeight = product.has_weight !== false && product.weight_g != null && Number(product.weight_g) > 0;
  const madeToOrder = product.is_made_to_order === true || !hasWeight;
  const estW = Number(product.estimated_weight_g || product.estimated_breakdown?.weight_g || 0);
  const w = hasWeight ? Number(product.weight_g) : estW;
  const fee = Number(product.fee_ratio);
  const bd = hasWeight ? (product.breakdown || calcPrice(w, gp, fee, product.stone_value)) : null;
  const images = product.images?.length
    ? product.images.map((i) => i.image)
    : product.primary_image
      ? [product.primary_image]
      : [];
  const mainImg = images[imgIdx] || images[0];
  const inStock = product.in_stock !== false && (product.stock ?? 1) > 0;
  const physicallyAvailable = hasWeight && inStock;
  const maxQty = madeToOrder ? 3 : Math.max(1, product.stock ?? 99);

  const ensureAuth = () => {
    if (!tokens || !user) {
      toast('برای رزرو یا خرید ابتدا وارد شوید یا ثبت‌نام کنید.');
      nav('/register');
      return false;
    }
    if (!isProfileReady(user)) {
      toast(profileGapMessage(user));
      nav(profileCompletePath());
      return false;
    }
    return true;
  };

  return (
    <section className="container product-detail-page">
      <div className="pd-breadcrumb">
        <Link to="/">خانه</Link>
        <span>/</span>
        <Link to="/products">محصولات</Link>
        <span>/</span>
        <Link to={`/products?category=${product.category_slug}`}>{product.category_name}</Link>
        <span>/</span>
        <span className="current">{product.name}</span>
      </div>

      <div className="pd-grid">
        <div className="pd-gallery">
          <div className="pd-main-media">
            {mainImg ? (
              <img src={mainImg} alt={product.name} />
            ) : (
              <span className="pd-placeholder">{product.placeholder_label || product.name}</span>
            )}
            {madeToOrder ? (
              <div className="pd-avail-badges">
                <span className="pd-orderable">قابل سفارش</span>
              </div>
            ) : !physicallyAvailable ? (
              <div className="pd-avail-badges">
                <span className="pd-oos">ناموجود</span>
              </div>
            ) : null}
          </div>
          {images.length > 1 && (
            <div className="pd-thumbs">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  className={`pd-thumb${i === imgIdx ? ' active' : ''}`}
                  onClick={() => setImgIdx(i)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pd-info">
          <div className="pd-tags">
            <span className="pd-cat">{product.category_name}</span>
            {product.tag && <span className="pd-tag">{product.tag}</span>}
            {product.is_featured && <span className="pd-tag">ویژه</span>}
            {madeToOrder && <span className="pd-tag pd-tag-mto">قابل سفارش</span>}
          </div>
          <h1>{product.name}</h1>
          {product.description && <p className="pd-desc">{product.description}</p>}

          <div className="pd-price-row">
            <div className="pd-price">
              {madeToOrder ? (
                <>قابل سفارش</>
              ) : bd ? (
                <>
                  {faPrice(bd.total)} <small>تومان</small>
                </>
              ) : (
                <>—</>
              )}
            </div>
            <div className="pd-live">
              <span className="live-dot" /> {madeToOrder ? 'ناموجود · قابل سفارش' : 'قیمت زنده'}
            </div>
          </div>

          {bd ? (
            <div className="pd-breakdown">
              <div className="pd-breakdown-title">تفکیک قیمت</div>
              <div className="pd-breakdown-row"><span>ارزش طلا ({faNum(w)} گرم × نرخ روز)</span><span>{faPrice(bd.gold)}</span></div>
              <div className="pd-breakdown-row"><span>اجرت ساخت (٪{faNum(Math.round(fee * 100))})</span><span>{faPrice(bd.fee)}</span></div>
              {bd.stone > 0 && <div className="pd-breakdown-row"><span>سنگ و نگین</span><span>{faPrice(bd.stone)}</span></div>}
              <div className="pd-breakdown-row"><span>مالیات ۹٪ اجرت</span><span>{faPrice(bd.tax)}</span></div>
              <div className="pd-breakdown-total"><span>قیمت نهایی</span><span>{faPrice(bd.total)} تومان</span></div>
            </div>
          ) : madeToOrder ? (
            <div className="pd-mto-hint">
              این مدل هم‌اکنون در ویترین موجود نیست. با «رزرو محصول» مبلغ رزرو را ببینید و سفارش خود را ثبت کنید.
            </div>
          ) : null}

          <div className="pd-specs">
            {[
              [
                hasWeight ? `${faNum(w)} گرم` : w > 0 ? `≈ ${faNum(w)} گرم` : 'تقریبی',
                hasWeight ? 'وزن' : 'وزن تقریبی',
              ],
              [faNum(product.karat || 18), 'عیار'],
              [madeToOrder ? 'سفارشی' : inStock ? faNum(product.stock ?? 0) : '۰', 'موجودی'],
              ['۱۸ ماه', 'گارانتی اصالت'],
            ].map(([v, l]) => (
              <div key={l} className="pd-spec">
                <div className="pd-spec-v">{v}</div>
                <div className="pd-spec-l">{l}</div>
              </div>
            ))}
          </div>

          <div className="pd-actions">
            <div className="pd-qty">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <div>{faNum(qty)}</div>
              <button type="button" onClick={() => setQty(Math.min(maxQty, qty + 1))}>+</button>
            </div>
            {madeToOrder ? (
              <button type="button" className="gold-btn" onClick={() => setReserveOpen(true)}>
                رزرو محصول
              </button>
            ) : (
              <button
                type="button"
                className="gold-btn"
                disabled={!physicallyAvailable}
                onClick={() => {
                  if (!ensureAuth()) return;
                  addToCart(product.id, qty);
                  toast(`«${product.name}» به گلد باکس افزوده شد`);
                  openCart();
                }}
              >
                {physicallyAvailable ? 'افزودن به گلد باکس' : 'ناموجود'}
              </button>
            )}
          </div>

          {/* Sticky mobile CTA — detail gallery is tall; keep action always reachable */}
          <div className="pd-mobile-cta">
            {madeToOrder ? (
              <button type="button" className="gold-btn" onClick={() => setReserveOpen(true)}>
                رزرو محصول
              </button>
            ) : (
              <button
                type="button"
                className="gold-btn"
                disabled={!physicallyAvailable}
                onClick={() => {
                  if (!ensureAuth()) return;
                  addToCart(product.id, qty);
                  toast(`«${product.name}» به گلد باکس افزوده شد`);
                  openCart();
                }}
              >
                {physicallyAvailable ? 'افزودن به گلد باکس' : 'ناموجود'}
              </button>
            )}
          </div>

          <ul className="pd-trust">
            <li>فاکتور رسمی و ضمانت اصالت</li>
            <li>ارسال بیمه‌شده به سراسر کشور</li>
            {madeToOrder ? (
              <li>مبلغ رزرو هنگام سفارش؛ تسویه نهایی بر اساس وزن واقعی</li>
            ) : (
              <li>امکان بازخرید طبق نرخ روز</li>
            )}
          </ul>
        </div>
      </div>

      {related && related.length > 0 && (
        <div className="pd-related">
          <h2>محصولات مشابه</h2>
          <div className="product-grid cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {madeToOrder && (
        <ReserveModal
          product={product}
          qty={qty}
          open={reserveOpen}
          onClose={() => setReserveOpen(false)}
        />
      )}
    </section>
  );
}
