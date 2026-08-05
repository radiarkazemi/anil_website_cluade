import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { calcPrice, faNum, faPrice } from '../utils/format';

export function ProductCard({ product }: { product: Product }) {
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast((s) => s.show);
  const cardRef = useRef<HTMLElement>(null);

  const w = Number(product.weight_g);
  const fee = Number(product.fee_ratio);
  const { total } = calcPrice(w, gp, fee, product.stone_value);

  const onMove = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--tilt-x', `${(-y * 8).toFixed(2)}deg`);
    el.style.setProperty('--tilt-y', `${(x * 10).toFixed(2)}deg`);
    el.style.setProperty('--spot-x', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--spot-y', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const onLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <article
      ref={cardRef}
      className="product-card tilt-card"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="tilt-shine" aria-hidden />
      <Link to={`/products/${product.slug}`} className="product-media">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} loading="lazy" />
        ) : (
          <span className="product-fallback">{product.placeholder_label || product.category_name}</span>
        )}
        {product.tag && <span className="product-tag">{product.tag}</span>}
      </Link>
      <div className="product-body">
        <div className="product-cat">{product.category_name}</div>
        <Link to={`/products/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        <div className="product-meta">وزن {faNum(w)} گرم · عیار ۱۸</div>
        <div className="product-row">
          <div>
            <div className="product-price">{faPrice(total)}</div>
            <div className="product-price-note">تومان · زنده</div>
          </div>
          <button
            type="button"
            className="add-btn"
            aria-label="افزودن به سبد"
            onClick={() => {
              addToCart(product.id);
              toast(`«${product.name}» به سبد افزوده شد`);
            }}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}
