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

  const hasWeight =
    product.has_weight !== false && product.weight_g != null && Number(product.weight_g) > 0;
  const madeToOrder = product.is_made_to_order === true || !hasWeight;
  const estW = Number(product.estimated_weight_g || 0);
  const w = hasWeight ? Number(product.weight_g) : estW;
  const fee = Number(product.fee_ratio);
  const total = hasWeight
    ? calcPrice(w, gp, fee, product.stone_value).total
    : product.estimated_price ?? (w > 0 ? calcPrice(w, gp, fee, product.stone_value).total : null);
  const deposit = product.deposit_amount ?? null;
  const physicallyAvailable = hasWeight && product.in_stock !== false;

  const tryAdd = () => {
    if (madeToOrder) {
      nav(`/products/${product.slug}`);
      toast('این قطعه ناموجود است؛ از صفحه محصول با بیعانه رزرو کنید.');
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
    addToCart(product.id);
    toast(`«${product.name}» به گلد باکس افزوده شد`);
    openCart();
  };

  return (
    <article className={`product-card${madeToOrder ? ' is-mto' : ''}`}>
      <Link to={`/products/${product.slug}`} className="product-media">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} loading="lazy" />
        ) : (
          <span className="product-fallback">{product.placeholder_label || product.category_name}</span>
        )}
        {product.tag && <span className="product-tag">{product.tag}</span>}
        {madeToOrder && (
          <span className="product-avail">
            <span className="avail-oos">ناموجود</span>
            <span className="avail-orderable">قابل سفارش</span>
          </span>
        )}
        {!madeToOrder && !physicallyAvailable && (
          <span className="product-avail">
            <span className="avail-oos">ناموجود</span>
          </span>
        )}
      </Link>
      <div className="product-body">
        <div className="product-cat">{product.category_name}</div>
        <Link to={`/products/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        <div className="product-meta">
          {hasWeight ? (
            product.placeholder_label?.includes('وزن حدودی') ? (
              <>وزن حدودی ≈ {faNum(w)} گرم · عیار ۱۸</>
            ) : (
              <>وزن {faNum(w)} گرم · عیار ۱۸</>
            )
          ) : w > 0 ? (
            <>وزن تقریبی ≈ {faNum(w)} گرم · مدل‌های مشابه</>
          ) : (
            <>وزن تقریبی از مدل‌های قبلی · عیار ۱۸</>
          )}
        </div>
        <div className="product-row">
          <div>
            {madeToOrder ? (
              <>
                <div className="product-price">
                  {deposit != null ? `بیعانه ${faPrice(deposit)}` : 'رزرو با بیعانه'}
                </div>
                <div className="product-price-note">
                  {total != null ? `تخمین ≈ ${faPrice(total)} تومان` : 'تهیه برای شما · قابل سفارش'}
                </div>
              </>
            ) : (
              <>
                <div className="product-price">{total != null ? faPrice(total) : '—'}</div>
                <div className="product-price-note">تومان · قیمت پویا</div>
              </>
            )}
          </div>
          <button
            type="button"
            className="add-btn"
            aria-label={madeToOrder ? 'رزرو با بیعانه' : 'افزودن به سبد'}
            onClick={tryAdd}
            disabled={!madeToOrder && !physicallyAvailable}
          >
            {madeToOrder ? '◎' : '+'}
          </button>
        </div>
      </div>
    </article>
  );
}
