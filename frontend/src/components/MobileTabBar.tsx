import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';

/** Persistent phone nav — keeps primary actions one thumb away. */
export function MobileTabBar() {
  const cartCount = useStore((s) => s.cartCount());
  const user = useStore((s) => s.user);
  const openCart = useUI((s) => s.openCart);

  return (
    <nav className="mobile-tabbar" aria-label="منوی پایین">
      <NavLink to="/" end className="mobile-tab">
        <span className="mobile-tab-ico" aria-hidden>⌂</span>
        <span>خانه</span>
      </NavLink>
      <NavLink to="/products" className="mobile-tab">
        <span className="mobile-tab-ico" aria-hidden>◇</span>
        <span>محصولات</span>
      </NavLink>
      <button type="button" className="mobile-tab" onClick={() => openCart()}>
        <span className="mobile-tab-ico" aria-hidden>
          ◈
          {cartCount > 0 && <span className="mobile-tab-badge">{cartCount}</span>}
        </span>
        <span>سبد</span>
      </button>
      <NavLink to={user ? '/account' : '/login'} className="mobile-tab">
        <span className="mobile-tab-ico" aria-hidden>○</span>
        <span>{user ? 'حساب' : 'ورود'}</span>
      </NavLink>
    </nav>
  );
}
