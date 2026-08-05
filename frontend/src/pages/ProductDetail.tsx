import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { useUI } from '../store/uiStore';
import { calcPrice, faNum, faPrice } from '../utils/format';

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const addToCart = useStore((s) => s.addToCart);
  const openCart = useUI((s) => s.openCart);
  const toast = useToast((s) => s.show);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

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
  }, [slug]);

  if (isLoading || !product) {
    return (
      <div className="container" style={{ padding: '60px var(--px)', textAlign: 'center', color: 'var(--text-dim)' }}>
        در حال بارگذاری…
      </div>
    );
  }

  const w = Number(product.weight_g);
  const fee = Number(product.fee_ratio);
  const bd = product.breakdown || calcPrice(w, gp, fee, product.stone_value);
  const images = product.images?.length
    ? product.images.map((i) => i.image)
    : product.primary_image
      ? [product.primary_image]
      : [];
  const mainImg = images[imgIdx] || images[0];
  const inStock = product.in_stock !== false && (product.stock ?? 1) > 0;
  const maxQty = Math.max(1, product.stock ?? 99);

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
            {!inStock && <div className="pd-oos">ناموجود</div>}
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
          </div>
          <h1>{product.name}</h1>
          {product.sku && <div className="pd-sku">کد کالا: <b dir="ltr">{product.sku}</b></div>}
          {product.description && <p className="pd-desc">{product.description}</p>}

          <div className="pd-price-row">
            <div className="pd-price">{faPrice(bd.total)} <small>تومان</small></div>
            <div className="pd-live"><span className="live-dot" /> قیمت زنده</div>
          </div>

          <div className="pd-breakdown">
            <div className="pd-breakdown-title">تفکیک قیمت</div>
            <div className="pd-breakdown-row"><span>ارزش طلا ({faNum(w)} گرم × نرخ روز)</span><span>{faPrice(bd.gold)}</span></div>
            <div className="pd-breakdown-row"><span>اجرت ساخت (٪{faNum(Math.round(fee * 100))})</span><span>{faPrice(bd.fee)}</span></div>
            {bd.stone > 0 && <div className="pd-breakdown-row"><span>سنگ و نگین</span><span>{faPrice(bd.stone)}</span></div>}
            <div className="pd-breakdown-row"><span>مالیات ۹٪ اجرت</span><span>{faPrice(bd.tax)}</span></div>
            <div className="pd-breakdown-total"><span>قیمت نهایی</span><span>{faPrice(bd.total)} تومان</span></div>
          </div>

          <div className="pd-specs">
            {[
              [faNum(w) + ' گرم', 'وزن'],
              [faNum(product.karat || 18), 'عیار'],
              [inStock ? faNum(product.stock ?? 0) : '۰', 'موجودی'],
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
            <button
              type="button"
              className="gold-btn"
              disabled={!inStock}
              onClick={() => {
                addToCart(product.id, qty);
                toast(`«${product.name}» به گلد باکس افزوده شد`);
                openCart();
              }}
            >
              {inStock ? 'افزودن به گلد باکس' : 'ناموجود'}
            </button>
          </div>

          <ul className="pd-trust">
            <li>فاکتور رسمی و ضمانت اصالت</li>
            <li>ارسال بیمه‌شده به سراسر کشور</li>
            <li>امکان بازخرید طبق نرخ روز</li>
          </ul>
        </div>
      </div>

      {related && related.length > 0 && (
        <div className="pd-related">
          <h2>محصولات مشابه</h2>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </section>
  );
}
