import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { useUI } from '../store/uiStore';
import { calcPrice, faNum, faPrice, faWeight } from '../utils/format';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';
import { IconConsult, IconHeart, IconShoppingBag } from './icons';
import { mediaUrl } from '../utils/mediaUrl';

type Variant = 'catalog' | 'related';

export function ProductCard({
  product,
  variant = 'catalog',
}: {
  product: Product;
  variant?: Variant;
}) {
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
  const inStock = product.in_stock !== false && (product.stock ?? 1) > 0;
  const canBuy = hasWeight && inStock;

  const tryAdd = () => {
    if (!canBuy) {
      nav(`/products/${product.slug}`);
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
    <article className={`product-card handoff-pc${variant === 'related' ? ' is-related' : ''}`}>
      <div className="handoff-pc-media">
        <Link to={`/products/${product.slug}`} className="handoff-pc-img" tabIndex={-1}>
          {product.primary_image ? (
            <img
              src={mediaUrl(product.primary_image)}
              alt={product.name}
              loading="lazy"
              decoding="async"
              width={480}
              height={480}
            />
          ) : (
            <span className="handoff-pc-fallback">{product.placeholder_label || product.category_name}</span>
          )}
        </Link>
        <span className={`handoff-pc-badge${canBuy ? ' is-stock' : ' is-inquire'}`}>
          {canBuy ? 'موجود' : 'استعلام قیمت'}
        </span>
        <button
          type="button"
          className={`handoff-pc-fav${loved ? ' is-on' : ''}`}
          aria-label={loved ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          aria-pressed={loved}
          onClick={() => setLoved((v) => !v)}
        >
          <IconHeart size={15} filled={loved} />
        </button>
      </div>
      <div className="handoff-pc-body">
        <div className="handoff-pc-cat">{product.category_name}</div>
        <Link to={`/products/${product.slug}`} className="handoff-pc-name">
          {product.name}
        </Link>
        <div className="handoff-pc-meta">
          {hasWeight ? (
            <>
              وزن تقریبی: {faWeight(w)} گرم <span aria-hidden>|</span> عیار {faNum(karat)}
            </>
          ) : (
            <>وزن و قیمت پس از تأیید <span aria-hidden>|</span> عیار {faNum(karat)}</>
          )}
        </div>
        <div className="handoff-pc-price">
          {total != null ? (
            <>
              <span className="handoff-pc-amount">{faPrice(total)}</span>
              <span className="handoff-pc-unit">تومان</span>
            </>
          ) : (
            <span className="handoff-pc-pending">وزن و قیمت پس از تأیید</span>
          )}
        </div>
        {variant === 'related' ? (
          <div className="handoff-pc-related-actions">
            <button type="button" className="handoff-pc-cart-sq" aria-label="افزودن به سبد" onClick={tryAdd} disabled={!canBuy}>
              <IconShoppingBag size={15} />
            </button>
            <Link to={`/products/${product.slug}`} className="handoff-pc-cta">
              مشاهده محصول
            </Link>
          </div>
        ) : canBuy ? (
          <button type="button" className="handoff-pc-cta" onClick={tryAdd}>
            <IconShoppingBag size={16} />
            افزودن به سبد خرید
          </button>
        ) : (
          <Link to={`/products/${product.slug}`} className="handoff-pc-cta is-inquire">
            <IconConsult size={16} />
            استعلام قیمت
          </Link>
        )}
      </div>
    </article>
  );
}
