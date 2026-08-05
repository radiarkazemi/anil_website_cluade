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
    <article className="product-card">
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
