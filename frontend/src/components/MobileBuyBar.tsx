import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { faNum } from '../utils/format';

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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6.2 8.2h11.6l-.9 10.1a1.8 1.8 0 0 1-1.8 1.5H8.9a1.8 1.8 0 0 1-1.8-1.5L6.2 8.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M9 8.2V6.8a3 3 0 0 1 6 0v1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        {cartCount > 0 && <span className="mobile-buybar-badge">{faNum(cartCount)}</span>}
      </button>
    </div>
  );
}
