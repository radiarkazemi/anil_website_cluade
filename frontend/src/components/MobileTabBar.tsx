import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { faNum } from '../utils/format';

function IconHome({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 10.8 12 4.5l7.5 6.3V20a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.4h-3.6v5.4H6A1.5 1.5 0 0 1 4.5 20v-9.2Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.14 : 0}
      />
    </svg>
  );
}

function IconShop({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 8.5h10l-.7 9.2a1.8 1.8 0 0 1-1.8 1.6H9.5a1.8 1.8 0 0 1-1.8-1.6L7 8.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.12 : 0}
      />
      <path
        d="M9.2 8.5V7.2a2.8 2.8 0 0 1 5.6 0v1.3"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBag({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.2 8.2h11.6l-.9 10.1a1.8 1.8 0 0 1-1.8 1.5H8.9a1.8 1.8 0 0 1-1.8-1.5L6.2 8.2Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.12 : 0}
      />
      <path d="M9 8.2V6.8a3 3 0 0 1 6 0v1.4" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" />
      <path d="M4.8 8.2h14.4" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" />
    </svg>
  );
}

function IconUser({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="9"
        r="3.4"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.14 : 0}
      />
      <path
        d="M5.5 19.2c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Phone-only bottom navigation — standard 4-tab commerce pattern. */
export function MobileTabBar() {
  const cartCount = useStore((s) => s.cartCount());
  const user = useStore((s) => s.user);
  const openCart = useUI((s) => s.openCart);

  return (
    <nav className="mobile-tabbar" aria-label="منوی پایین">
      <NavLink to="/" end className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}>
        {({ isActive }) => (
          <>
            <span className="mobile-tab-ico"><IconHome active={isActive} /></span>
            <span>خانه</span>
          </>
        )}
      </NavLink>
      <NavLink to="/products" className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}>
        {({ isActive }) => (
          <>
            <span className="mobile-tab-ico"><IconShop active={isActive} /></span>
            <span>فروشگاه</span>
          </>
        )}
      </NavLink>
      <button type="button" className="mobile-tab" onClick={() => openCart()}>
        <span className="mobile-tab-ico">
          <IconBag />
          {cartCount > 0 && <span className="mobile-tab-badge">{cartCount > 9 ? '۹+' : faNum(cartCount)}</span>}
        </span>
        <span>سبد</span>
      </button>
      <NavLink
        to={user ? '/account' : '/login'}
        className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}
      >
        {({ isActive }) => (
          <>
            <span className="mobile-tab-ico"><IconUser active={isActive} /></span>
            <span>{user ? 'حساب' : 'ورود'}</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
