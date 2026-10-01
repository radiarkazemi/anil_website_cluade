import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { useFavorites } from '../store/favoritesStore';
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

function IconGrid({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.7} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.14 : 0} />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.7} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.14 : 0} />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.7} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.14 : 0} />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.7} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.14 : 0} />
    </svg>
  );
}

function IconHeart({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20.2s-6.8-4.2-8.4-8.1C2.4 9.2 3.7 6.6 6.5 6.2c1.7-.2 3.2.7 3.9 2 .7-1.3 2.2-2.2 3.9-2 2.8.4 4.1 3 3 5.9C18.8 16 12 20.2 12 20.2Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.16 : 0}
      />
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

/**
 * Mobile bottom tabs — handoff order (RTL visual from right):
 * Home · Products · Favourites · Account. Cart stays in the header.
 */
export function MobileTabBar() {
  const { pathname } = useLocation();
  const cartOpen = useUI((s) => s.cartOpen);
  const favCount = useFavorites((s) => s.ids.length);
  const user = useStore((s) => s.user);

  const isPdp = pathname.startsWith('/products/') && pathname !== '/products';
  if (isPdp || cartOpen) return null;

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
            <span className="mobile-tab-ico"><IconGrid active={isActive} /></span>
            <span>محصولات</span>
          </>
        )}
      </NavLink>
      <NavLink to="/favorites" className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}>
        {({ isActive }) => (
          <>
            <span className="mobile-tab-ico">
              <IconHeart active={isActive} />
              {favCount > 0 && (
                <span className="mobile-tab-badge">{favCount > 9 ? '۹+' : faNum(favCount)}</span>
              )}
            </span>
            <span>علاقه‌مندی</span>
          </>
        )}
      </NavLink>
      <NavLink
        to={user ? '/account' : '/login'}
        className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}
      >
        {({ isActive }) => (
          <>
            <span className="mobile-tab-ico"><IconUser active={isActive} /></span>
            <span>حساب</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
