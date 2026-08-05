import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { calcPrice, faNum, faPrice } from '../utils/format';

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast((s) => s.show);
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.product(slug!).then((r) => r.data),
    enabled: !!slug,
  });

  const { data: related } = useQuery({
    queryKey: ['products', product?.category_slug],
    queryFn: () => api.products({ category: product!.category_slug, page_size: '5' }).then((r) => r.data.results.filter((p) => p.slug !== slug).slice(0, 4)),
    enabled: !!product,
  });

  if (isLoading || !product) return <div className="container" style={{ padding: '60px var(--px)', textAlign: 'center', color: 'var(--text-dim)' }}>در حال بارگذاری…</div>;

  const w = Number(product.weight_g);
  const fee = Number(product.fee_ratio);
  const bd = calcPrice(w, gp, fee, product.stone_value);

  return (
    <section className="container" style={{ padding: '40px var(--px) 60px' }}>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 26 }}>
        <Link to="/">خانه</Link> <span style={{ color: '#5c5344' }}>/</span>{' '}
        <Link to="/products">محصولات</Link> <span style={{ color: '#5c5344' }}>/</span>{' '}
        <span style={{ color: 'var(--gold-deep)' }}>{product.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 44, alignItems: 'start' }}>
        <div style={{
          height: 460, borderRadius: 22, overflow: 'hidden',
          background: 'repeating-linear-gradient(135deg,#120f0a 0 18px,#181309 18px 36px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(212,175,55,.16)',
        }}>
          {product.images && product.images.length > 0 ? (
            <img src={product.images[0].image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : product.primary_image ? (
            <img src={product.primary_image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#6f6553', border: '1px dashed rgba(212,175,55,.3)', padding: '8px 14px', borderRadius: 8 }}>{product.placeholder_label}</span>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--warm)', background: 'var(--gold-light)', padding: '4px 11px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>{product.category_name}</span>
            {product.tag && <span style={{ fontSize: 12, color: 'var(--gold-light)', border: '1px solid rgba(212,175,55,.4)', padding: '3px 11px', borderRadius: 'var(--radius-pill)' }}>{product.tag}</span>}
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 10 }}>{product.name}</h1>
          {product.description && <p style={{ color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 2, marginBottom: 22 }}>{product.description}</p>}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--gold-light)' }}>{faPrice(bd.total)}</div>
            <div style={{ fontSize: 14, color: '#7c7263' }}>تومان</div>
            <div style={{ fontSize: 12, color: 'var(--up)', display: 'flex', alignItems: 'center', gap: 5, marginInlineStart: 'auto' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--up)', boxShadow: '0 0 8px var(--up)', animation: 'twinkle 1.4s infinite' }} /> قیمت زنده
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ border: '1px solid rgba(212,175,55,.18)', borderRadius: 16, padding: '18px 20px', margin: '18px 0 24px', background: 'rgba(212,175,55,.03)' }}>
            <div style={{ fontSize: 12, color: 'var(--gold-deep)', fontWeight: 700, marginBottom: 14 }}>تفکیک قیمت</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span style={{ color: 'var(--text-muted)' }}>ارزش طلا ({faNum(w)} گرم × نرخ روز)</span><span style={{ fontWeight: 600 }}>{faPrice(bd.gold)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span style={{ color: 'var(--text-muted)' }}>اجرت ساخت (٪{faNum(Math.round(fee * 100))})</span><span style={{ fontWeight: 600 }}>{faPrice(bd.fee)}</span></div>
              {bd.stone > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span style={{ color: 'var(--text-muted)' }}>سنگ و نگین</span><span style={{ fontWeight: 600 }}>{faPrice(bd.stone)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span style={{ color: 'var(--text-muted)' }}>مالیات بر ارزش افزوده (٪۹ اجرت)</span><span style={{ fontWeight: 600 }}>{faPrice(bd.tax)}</span></div>
              <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>قیمت نهایی</span><span style={{ color: 'var(--gold-light)', fontWeight: 800 }}>{faPrice(bd.total)} تومان</span></div>
            </div>
          </div>

          {/* Qty + Add */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(212,175,55,.3)', borderRadius: 12, overflow: 'hidden' }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ border: 'none', width: 44, height: 48, background: 'transparent', color: 'var(--gold-light)', fontSize: 20 }}>−</button>
              <div style={{ width: 48, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>{faNum(qty)}</div>
              <button onClick={() => setQty(qty + 1)} style={{ border: 'none', width: 44, height: 48, background: 'transparent', color: 'var(--gold-light)', fontSize: 20 }}>+</button>
            </div>
            <button onClick={() => { addToCart(product.id, qty); toast(`«${product.name}» به سبد افزوده شد`); }} className="gold-btn" style={{ flex: 1, height: 48, fontSize: 15 }}>افزودن به سبد خرید</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
            {[
              [faNum(w) + ' گرم', 'وزن'],
              ['۱۸', 'عیار'],
              ['۱۸ ماه', 'گارانتی'],
            ].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related */}
      {related && related.length > 0 && (
        <div style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 22 }}>محصولات مشابه</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </section>
  );
}
