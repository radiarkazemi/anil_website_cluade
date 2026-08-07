import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { faNum } from '../utils/format';
import { IconGoldBox } from './icons';

/** Slim conversion bar — shop + cart only (not a full app tab bar). */
export function MobileBuyBar() {
  const cartCount = useStore((s) => s.cartCount());
  const openCart = useUI((s) => s.openCart);
  const { pathname } = useLocation();

  // Hide on product detail where page already has a primary buy CTA
  if (pathname.startsWith('/products/') && pathname !== '/products') return null;

  return (
    <div className="mobile-buybar" role="region" aria-label="دسترسی سریع خرید">
      <Link to="/products" className="mobile-buybar-cta">
        مشاهده محصولات
      </Link>
      <button type="button" className="mobile-buybar-cart" onClick={() => openCart()} aria-label="گلد باکس">
        <IconGoldBox size={20} />
        {cartCount > 0 && <span className="mobile-buybar-badge">{faNum(cartCount)}</span>}
      </button>
    </div>
  );
}
