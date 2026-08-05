import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { useToast } from '../store/toastStore';
import { calcPrice, faNum, faPrice } from '../utils/format';
import type { Product } from '../types';

export function CartDrawer() {
  const cartOpen = useUI((s) => s.cartOpen);
  const closeCart = useUI((s) => s.closeCart);
  const cart = useStore((s) => s.cart);
  const updateQty = useStore((s) => s.updateQty);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const clearCart = useStore((s) => s.clearCart);
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const toast = useToast((s) => s.show);

  const { data } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => api.products({ page_size: '200' }).then((r) => r.data.results),
    staleTime: 60000,
  });
  const products = data ?? [];

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cartItems = cart.map((c) => {
    const p = products.find((x) => x.id === c.productId);
    if (!p) return null;
    const pr = calcPrice(Number(p.weight_g), gp, Number(p.fee_ratio), p.stone_value);
    return { ...c, product: p, price: pr.total };
  }).filter(Boolean) as { productId: string; qty: number; product: Product; price: number }[];

  const subtotal = cartItems.reduce((s, c) => s + c.price * c.qty, 0);
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);

  const handleCheckout = async () => {
    const name = (document.getElementById('co-name') as HTMLInputElement)?.value || '';
    const phone = (document.getElementById('co-phone') as HTMLInputElement)?.value || '';
    const address = (document.getElementById('co-address') as HTMLTextAreaElement)?.value || '';
    if (!name.trim() || !phone.trim()) { setError('نام و شماره تماس الزامی است.'); return; }
    setBusy(true); setError('');
    try {
      const { data: order } = await api.createOrder({
        full_name: name.trim(), phone: phone.trim(), address: address.trim(),
        items: cart.map((c) => ({ product_id: c.productId, qty: c.qty })),
      });
      clearCart(); setCheckoutOpen(false); closeCart();
      toast(`سفارش ${order.order_number} ثبت شد — ${faPrice(order.total)} تومان`);
    } catch (e: any) {
      setError(e.response?.data?.detail || e.response?.data?.items?.[0] || 'ثبت سفارش ناموفق بود.');
    } finally { setBusy(false); }
  };

  if (!cartOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div onClick={closeCart} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 420, maxWidth: '92vw',
        background: '#0c0a07', borderLeft: '1px solid rgba(212,175,55,.2)',
        boxShadow: '20px 0 60px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column',
        animation: 'slidein .28s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>سبد خرید</div>
          <button onClick={closeCart} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8bfb0', background: 'transparent', fontSize: 16 }}>✕</button>
        </div>

        {checkoutOpen ? (
          <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>ثبت سفارش</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>جمع: <span style={{ color: 'var(--gold-light)', fontWeight: 800, fontSize: 16 }}>{faPrice(subtotal)}</span> تومان</div>
            <input id="co-name" placeholder="نام و نام خانوادگی" className="input" />
            <input id="co-phone" placeholder="شماره تماس" className="input" dir="ltr" />
            <textarea id="co-address" placeholder="آدرس ارسال" className="input" style={{ height: 'auto', padding: 12, minHeight: 80 }} />
            {error && <div style={{ color: 'var(--down)', fontSize: 13 }}>{error}</div>}
            <button onClick={handleCheckout} className="gold-btn" disabled={busy} style={{ marginTop: 4 }}>{busy ? 'در حال ثبت…' : 'ثبت نهایی سفارش'}</button>
            <button onClick={() => setCheckoutOpen(false)} className="outline-btn" style={{ padding: '12px 24px' }}>بازگشت</button>
          </div>
        ) : cartItems.length > 0 ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cartItems.map((c) => (
                <div key={c.productId} style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
                  <div style={{ flex: '0 0 68px', width: 68, height: 68, borderRadius: 10, background: 'repeating-linear-gradient(135deg,#171410 0 10px,#1e1a13 10px 20px)', border: '1px solid rgba(212,175,55,.2)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{c.product.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 8 }}>{c.product.category_name} · {faNum(Number(c.product.weight_g))} گرم</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(212,175,55,.25)', borderRadius: 9, overflow: 'hidden' }}>
                        <button onClick={() => updateQty(c.productId, c.qty - 1)} style={{ border: 'none', width: 28, height: 30, background: 'transparent', color: 'var(--gold-light)', fontSize: 16 }}>−</button>
                        <div style={{ width: 30, textAlign: 'center', fontSize: 13.5, fontWeight: 700 }}>{faNum(c.qty)}</div>
                        <button onClick={() => updateQty(c.productId, c.qty + 1)} style={{ border: 'none', width: 28, height: 30, background: 'transparent', color: 'var(--gold-light)', fontSize: 16 }}>+</button>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold-light)' }}>{faPrice(c.price * c.qty)}</div>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(c.productId)} style={{ border: 'none', background: 'transparent', color: '#7c7263', fontSize: 14, alignSelf: 'flex-start', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>جمع کل ({faNum(totalQty)} قلم)</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold-light)' }}>{faPrice(subtotal)} <span style={{ fontSize: 12, color: '#7c7263', fontWeight: 500 }}>تومان</span></span>
              </div>
              <div style={{ fontSize: 11.5, color: '#7c7263', marginBottom: 16 }}>قیمت‌ها بر پایه‌ی نرخ لحظه‌ای طلا محاسبه شده.</div>
              <button onClick={() => setCheckoutOpen(true)} className="gold-btn" style={{ width: '100%' }}>ادامه‌ی فرآیند پرداخت</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 46 }}>🛍</div>
            <div style={{ color: '#c8bfb0', fontSize: 16, fontWeight: 600 }}>سبد خرید شما خالی است</div>
            <button onClick={closeCart} className="gold-btn" style={{ marginTop: 8, padding: '13px 26px', fontSize: 14 }}>مشاهده‌ی محصولات</button>
          </div>
        )}
      </div>
    </div>
  );
}
