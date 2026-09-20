import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import type { Product, WishlistItem } from '../types';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { useUI } from '../store/uiStore';
import { useOrdersEnabled } from '../hooks/useOrdersEnabled';
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
  const qc = useQueryClient();
  const { ordersEnabled, salesClosedMessage } = useOrdersEnabled();

  const { data: wishlist = [] } = useQuery({
    queryKey: ['my-wishlist'],
    queryFn: async () => {
      const r = await api.wishlist();
      const d = r.data as WishlistItem[] | { results?: WishlistItem[] };
      return Array.isArray(d) ? d : d.results || [];
    },
    enabled: !!tokens,
    staleTime: 30_000,
  });

  const wishEntry = wishlist.find((w) => w.product?.id === product.id);

  const toggleWish = useMutation({
    mutationFn: async () => {
      if (wishEntry) return api.removeWishlist(wishEntry.id);
      return api.addWishlist(product.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-wishlist'] });
      toast(wishEntry ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها افزوده شد');
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast(e.response?.data?.detail || 'عملیات علاقه‌مندی ناموفق');
    },
  });

  const hasWeight =
    product.has_weight !== false && product.weight_g != null && Number(product.weight_g) > 0;
  const w = hasWeight ? Number(product.weight_g) : 0;
  const fee = Number(product.fee_ratio);
  const total = hasWeight ? calcPrice(w, gp, fee, product.stone_value).total : null;

  const tryAdd = () => {
    if (!ordersEnabled) {
      toast(salesClosedMessage);
      return;
    }
    if (!hasWeight) {
      toast('وزن این قطعه هنوز تأیید نشده؛ از مشاور هوشمند کمک بگیرید یا با گالری تماس بگیرید.');
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

  const onWishClick = () => {
    if (!tokens) {
      toast('برای علاقه‌مندی وارد شوید.');
      nav('/login');
      return;
    }
    toggleWish.mutate();
  };

  return (
    <article className="product-card">
      <div className="product-media">
        <Link to={`/products/${product.slug}`} className="product-media-link" aria-label={product.name}>
          {product.primary_image ? (
            <img
              src={product.primary_image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          ) : (
            <span className="product-fallback">{product.placeholder_label || product.category_name}</span>
          )}
        </Link>
        {product.tag && <span className="product-tag">{product.tag}</span>}
        <button
          type="button"
          className={`wish-btn${wishEntry ? ' on' : ''}`}
          aria-label={wishEntry ? 'حذف از علاقه‌مندی' : 'افزودن به علاقه‌مندی'}
          aria-pressed={!!wishEntry}
          onClick={onWishClick}
          disabled={toggleWish.isPending}
        >
          {wishEntry ? '♥' : '♡'}
        </button>
      </div>
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
          ) : (
            <>وزن پس از تأیید · عیار ۱۸</>
          )}
        </div>
        <div className="product-row">
          <div>
            <div className="product-price">{total != null ? faPrice(total) : 'قیمت پس از تأیید وزن'}</div>
            <div className="product-price-note">
              {total != null ? 'تومان · قیمت پویا' : 'با مشاور یا گالری هماهنگ کنید'}
            </div>
          </div>
          <button
            type="button"
            className="add-btn"
            aria-label={ordersEnabled ? 'افزودن به سبد' : 'فروش بسته است'}
            onClick={tryAdd}
            disabled={!hasWeight || !ordersEnabled}
            title={!ordersEnabled ? salesClosedMessage : undefined}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}
