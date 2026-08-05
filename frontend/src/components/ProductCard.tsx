import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { calcPrice, faNum, faPrice } from '../utils/format';

export function ProductCard({ product }: { product: Product }) {
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast((s) => s.show);

  const w = Number(product.weight_g);
  const fee = Number(product.fee_ratio);
  const { total } = calcPrice(w, gp, fee, product.stone_value);

  return (
    <div className="card">
      <Link to={`/products/${product.slug}`} style={{
        position: 'relative', height: 210, overflow: 'hidden',
        background: 'repeating-linear-gradient(135deg,#171410 0 15px,#1e1a13 15px 30px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(212,175,55,.16), transparent 60%)' }} />
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{
            fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, color: '#6f6553',
            border: '1px dashed rgba(212,175,55,.35)', padding: '6px 11px', borderRadius: 8,
            background: 'rgba(0,0,0,.3)',
          }}>{product.placeholder_label || product.category_name}</span>
        )}
        {product.tag && (
          <span style={{
            position: 'absolute', top: 12, right: 12, fontSize: 10.5, fontWeight: 800,
            color: 'var(--warm)', background: 'var(--gold-light)', padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
          }}>{product.tag}</span>
        )}
      </Link>
      <div style={{ padding: '16px 16px 18px' }}>
        <div style={{ fontSize: 11, color: 'var(--gold-deep)', marginBottom: 6 }}>{product.category_name}</div>
        <Link to={`/products/${product.slug}`} style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)', marginBottom: 6, display: 'block' }}>
          {product.name}
        </Link>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          وزن {faNum(w)} گرم · عیار ۱۸
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--gold-light)' }}>{faPrice(total)}</div>
            <div style={{ fontSize: 10.5, color: '#7c7263' }}>تومان · قیمت پویا</div>
          </div>
          <button onClick={(e) => { e.preventDefault(); addToCart(product.id); toast(`«${product.name}» به سبد افزوده شد`); }}
            style={{
              border: 'none', width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg,#f4d98b,#d4af37)', color: 'var(--warm)',
              fontSize: 19, fontWeight: 700, boxShadow: '0 8px 20px rgba(212,175,55,.3)',
            }}>+</button>
        </div>
      </div>
    </div>
  );
}
