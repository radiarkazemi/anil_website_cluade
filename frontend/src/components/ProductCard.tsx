import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { useUI } from '../store/uiStore';
import { calcPrice, faNum, faPrice } from '../utils/format';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';

export function ProductCard({ product }: { product: Product }) {
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const addToCart = useStore((s) => s.addToCart);
  const user = useStore((s) => s.user);
  const tokens = useStore((s) => s.tokens);
  const openCart = useUI((s) => s.openCart);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();

  const w = Number(product.weight_g);
  const fee = Number(product.fee_ratio);
  const { total } = calcPrice(w, gp, fee, product.stone_value);

  const tryAdd = () => {
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
    addToCart(product.id);
    toast(`«${product.name}» به گلد باکس افزوده شد`);
    openCart();
  };

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
            <div className="product-price-note">تومان · قیمت پویا</div>
          </div>
          <button type="button" className="add-btn" aria-label="افزودن به سبد" onClick={tryAdd}>
            +
          </button>
        </div>
      </div>
    </article>
  );
}
