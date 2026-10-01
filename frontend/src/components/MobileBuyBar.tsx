import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { useToast } from '../store/toastStore';
import { useFavorites } from '../store/favoritesStore';
import { calcPrice, faPrice } from '../utils/format';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';
import { IconHeart, IconShoppingBag } from './icons';
import { useNavigate } from 'react-router-dom';

/**
 * Sticky purchase bar for product detail only.
 * Replaces the tab bar on PDP (handoff: one fixed bottom surface).
 */
export function MobileBuyBar() {
  const { pathname } = useLocation();
  const isPdp = pathname.startsWith('/products/') && pathname !== '/products';
  const slug = isPdp ? decodeURIComponent(pathname.replace(/^\/products\//, '').replace(/\/$/, '')) : '';
  const cartOpen = useUI((s) => s.cartOpen);

  const { data: product } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.product(slug).then((r) => r.data),
    enabled: Boolean(slug),
  });

  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const addToCart = useStore((s) => s.addToCart);
  const user = useStore((s) => s.user);
  const tokens = useStore((s) => s.tokens);
  const openCart = useUI((s) => s.openCart);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();
  const loved = useFavorites((s) => (product ? s.has(product.id) : false));
  const toggleFav = useFavorites((s) => s.toggle);

  if (!isPdp || cartOpen || !product) return null;

  const hasWeight =
    product.has_weight !== false && product.weight_g != null && Number(product.weight_g) > 0;
  const w = hasWeight ? Number(product.weight_g) : 0;
  const fee = Number(product.fee_ratio);
  const total = hasWeight ? calcPrice(w, gp, fee, product.stone_value).total : null;
  const inStock = product.in_stock !== false && (product.stock ?? 1) > 0;
  const canBuy = hasWeight && inStock;

  const primaryAction = () => {
    if (!canBuy) {
      toast('برای استعلام وزن و قیمت با گالری تماس بگیرید یا از مشاور استفاده کنید.');
      return;
    }
    if (!tokens || !user) {
      toast('برای ثبت سفارش ابتدا وارد شوید یا ثبت‌نام کنید.');
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
    <div className="mobile-buybar mobile-pdp-bar" role="region" aria-label="خرید محصول">
      <button
        type="button"
        className={`mobile-pdp-fav${loved ? ' is-on' : ''}`}
        aria-label={loved ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
        aria-pressed={loved}
        onClick={() => {
          if (!product) return;
          const on = toggleFav(product.id);
          toast(on ? 'به علاقه‌مندی‌ها افزوده شد' : 'از علاقه‌مندی‌ها حذف شد');
        }}
      >
        <IconHeart size={18} filled={loved} />
      </button>
      <div className="mobile-pdp-price">
        {total != null ? (
          <>
            <strong>{faPrice(total)}</strong>
            <span>تومان</span>
          </>
        ) : (
          <strong className="is-pending">پس از تأیید وزن</strong>
        )}
      </div>
      <button
        type="button"
        className="mobile-buybar-cta"
        disabled={!canBuy}
        onClick={primaryAction}
      >
        <IconShoppingBag size={16} />
        {!hasWeight ? 'استعلام قیمت' : inStock ? 'ثبت سفارش' : 'ناموجود'}
      </button>
    </div>
  );
}
