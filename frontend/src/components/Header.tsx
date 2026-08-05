import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { faPrice } from '../utils/format';

export function Header() {
  const goldPrice = useStore((s) => s.goldPrice);
  const cartCount = useStore((s) => s.cartCount());
  const user = useStore((s) => s.user);
  const openCart = useUI((s) => s.openCart);

  const gp = goldPrice?.price_18k_per_gram ?? 0;

  return (
    <>
      <div style={{
        background: 'linear-gradient(90deg,#0d0b07,#1a1206,#0d0b07)',
        borderBottom: '1px solid var(--border-gold)', textAlign: 'center',
        padding: '9px 20px', fontSize: 12.5, color: 'var(--gold-deep)', letterSpacing: '.3px',
      }}>
        ✦ ارسال امن و بیمه‌شده به سراسر کشور · ضمانت اصالت و بازخرید · مشاوره‌ی رایگان تخصصی ✦
      </div>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(6,6,6,.82)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px var(--px)', gap: 24,
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', border: '1.5px solid var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold-light)', fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 24,
            }}>A</div>
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", letterSpacing: 5, color: 'var(--text)', fontSize: 20, fontWeight: 600 }}>ANIL</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>GOLD & JEWELRY</div>
            </div>
          </Link>

          <nav style={{ display: 'flex', gap: 28, color: '#c8bfb0', fontSize: 14.5, fontWeight: 500 }}>
            <Link to="/">خانه</Link>
            <Link to="/products">محصولات</Link>
            <Link to="/products">قیمت طلا</Link>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {gp > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px',
                border: '1px solid rgba(212,175,55,.3)', borderRadius: 'var(--radius-pill)',
                background: 'rgba(212,175,55,.06)',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: 'var(--up)',
                  boxShadow: '0 0 8px var(--up)', animation: 'twinkle 1.4s infinite',
                }} />
                <span style={{ fontSize: 12, color: '#9a9186' }}>طلای ۱۸</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gold-light)' }}>{faPrice(gp)}</span>
              </div>
            )}

            {user ? (
              <Link to="/profile" style={{
                width: 38, height: 38, borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,255,255,.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#c8bfb0', fontSize: 16,
              }}>👤</Link>
            ) : (
              <Link to="/login" style={{
                fontSize: 13, color: 'var(--gold-light)', padding: '8px 14px',
                border: '1px solid rgba(212,175,55,.3)', borderRadius: 'var(--radius-sm)',
              }}>ورود</Link>
            )}

            <button onClick={openCart} style={{
              position: 'relative', width: 38, height: 38, borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255,255,255,.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#c8bfb0', fontSize: 15,
              background: 'transparent',
            }}>
              🛍
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, left: -6, background: 'var(--gold)',
                  color: 'var(--warm)', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18,
                  padding: '0 4px', borderRadius: 'var(--radius-pill)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
