import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { useToast } from '../store/toastStore';
import { calcPrice, faNum, faPrice } from '../utils/format';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';
import type { Product } from '../types';
import { IconGoldBox } from './icons';

type Step = 'cart' | 'checkout';

function formatApiErrors(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;
  if (typeof d.detail === 'string') {
    const labels = Array.isArray(d.missing_field_labels)
      ? (d.missing_field_labels as string[]).join('، ')
      : '';
    return labels ? `${d.detail} (${labels})` : d.detail;
  }
  return Object.entries(d)
    .map(([, v]) => {
      const msg = Array.isArray(v) ? v.join('، ') : String(v);
      return msg;
    })
    .filter(Boolean)
    .join(' — ');
}

export function CartDrawer() {
  const cartOpen = useUI((s) => s.cartOpen);
  const closeCart = useUI((s) => s.closeCart);
  const cart = useStore((s) => s.cart);
  const updateQty = useStore((s) => s.updateQty);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const clearCart = useStore((s) => s.clearCart);
  const user = useStore((s) => s.user);
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();

  const { data } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => api.productsAll({ page_size: '200' }),
    staleTime: 60000,
  });

  const products = data ?? [];
  const [step, setStep] = useState<Step>('cart');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const cartItems = cart
    .map((c) => {
      const p = products.find((x) => x.id === c.productId);
      if (!p) return null;
      const pr = calcPrice(Number(p.weight_g), gp, Number(p.fee_ratio), p.stone_value);
      return { ...c, product: p, price: pr.total };
    })
    .filter(Boolean) as { productId: string; qty: number; product: Product; price: number }[];

  const subtotal = cartItems.reduce((s, c) => s + c.price * c.qty, 0);
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);

  const resetAndClose = () => {
    setStep('cart');
    setError('');
    setNote('');
    closeCart();
  };

  const goCompleteProfile = () => {
    resetAndClose();
    nav(profileCompletePath());
  };

  const handleContinue = () => {
    if (!user) {
      toast('برای ادامه خرید وارد شوید یا ثبت‌نام کنید.');
      resetAndClose();
      nav('/login');
      return;
    }
    if (!isProfileReady(user)) {
      toast(profileGapMessage(user));
      goCompleteProfile();
      return;
    }
    setError('');
    setStep('checkout');
  };

  const handleCheckout = async () => {
    if (busy) return;
    if (!user || !isProfileReady(user)) {
      toast(profileGapMessage(user));
      goCompleteProfile();
      return;
    }
    if (!cart.length) {
      setError('گلد باکس خالی است.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data: order } = await api.createOrderFromProfile({
        items: cart.map((c) => ({ product_id: c.productId, qty: c.qty })),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      clearCart();
      toast(`سفارش ${order.order_number} ثبت شد — ادامه پرداخت آزمایشی`);
      resetAndClose();
      nav(`/payment/demo/${order.order_number}`);
    } catch (e: any) {
      const status = e.response?.status;
      const formatted = formatApiErrors(e.response?.data);
      if (status === 403 || status === 401) {
        toast(formatted || profileGapMessage(user));
        goCompleteProfile();
        return;
      }
      setError(
        formatted ||
          (status === 429 ? 'تعداد درخواست زیاد است — چند ثانیه صبر کنید.' : 'ثبت سفارش ناموفق بود.'),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!cartOpen) return null;

  return (
    <div className="goldbox-overlay">
      <div className="goldbox-backdrop" onClick={resetAndClose} />
      <aside className="goldbox-panel" role="dialog" aria-label="گلد باکس">
        <header className="goldbox-head">
          <div className="goldbox-head-title">
            <span className="goldbox-head-ico" aria-hidden>
              <IconGoldBox size={22} />
            </span>
            <div>
              <div className="goldbox-title">گلد باکس</div>
              <div className="goldbox-sub">
                {step === 'cart' && `${faNum(totalQty)} قلم`}
                {step === 'checkout' && 'تأیید و پرداخت'}
              </div>
            </div>
          </div>
          <button type="button" className="goldbox-close" onClick={resetAndClose}>
            ✕
          </button>
        </header>

        {step === 'checkout' ? (
          <div className="goldbox-body">
            <div className="goldbox-sum">
              جمع قابل پرداخت: <strong>{faPrice(subtotal)}</strong> تومان
            </div>
            <div className="goldbox-profile-box">
              <div className="goldbox-profile-title">ارسال با اطلاعات حساب</div>
              <div>{user?.full_name}</div>
              <div dir="ltr">{user?.phone}</div>
              <div>{user?.email}</div>
              <div>
                {user?.city} — {user?.address}
              </div>
              <div dir="ltr">کد پستی: {user?.postal_code}</div>
              <div dir="ltr">کد ملی: {user?.national_code}</div>
              <button type="button" className="text-link" onClick={goCompleteProfile}>
                ویرایش در پروفایل
              </button>
            </div>
            <textarea
              className="input"
              placeholder="یادداشت سفارش (اختیاری)"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {error && <div className="goldbox-error">{error}</div>}
            <button type="button" className="gold-btn" disabled={busy} onClick={handleCheckout}>
              {busy ? 'در حال ثبت…' : 'ثبت سفارش و پرداخت آزمایشی'}
            </button>
            <button type="button" className="outline-btn" onClick={() => setStep('cart')}>
              بازگشت به گلد باکس
            </button>
          </div>
        ) : cartItems.length > 0 ? (
          <>
            <div className="goldbox-list">
              {cartItems.map((c) => (
                <div key={c.productId} className="goldbox-item">
                  <div className="goldbox-thumb">
                    {c.product.primary_image || c.product.images?.[0]?.image ? (
                      <img src={c.product.primary_image || c.product.images![0].image} alt="" />
                    ) : null}
                  </div>
                  <div className="goldbox-item-body">
                    <div className="goldbox-item-name">{c.product.name}</div>
                    <div className="goldbox-item-meta">
                      {c.product.category_name} · {faNum(Number(c.product.weight_g))} گرم
                    </div>
                    <div className="goldbox-item-row">
                      <div className="pd-qty compact">
                        <button type="button" onClick={() => updateQty(c.productId, c.qty - 1)}>
                          −
                        </button>
                        <div>{faNum(c.qty)}</div>
                        <button type="button" onClick={() => updateQty(c.productId, c.qty + 1)}>
                          +
                        </button>
                      </div>
                      <div className="goldbox-item-price">{faPrice(c.price * c.qty)}</div>
                    </div>
                  </div>
                  <button type="button" className="goldbox-remove" onClick={() => removeFromCart(c.productId)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <footer className="goldbox-foot">
              <div className="goldbox-total-row">
                <span>جمع کل ({faNum(totalQty)} قلم)</span>
                <strong>
                  {faPrice(subtotal)} <small>تومان</small>
                </strong>
              </div>
              <p className="goldbox-note">قیمت بر اساس نرخ لحظه‌ای طلا · پرداخت آزمایشی فعال است</p>
              {!user && (
                <p className="goldbox-note" style={{ color: 'var(--down)' }}>
                  برای ادامه باید وارد شوید.{' '}
                  <Link to="/login" onClick={resetAndClose}>
                    ورود
                  </Link>
                </p>
              )}
              {user && !isProfileReady(user) && (
                <p className="goldbox-note" style={{ color: 'var(--down)' }}>
                  {profileGapMessage(user)}
                </p>
              )}
              <button type="button" className="gold-btn" onClick={handleContinue}>
                ادامه خرید و پرداخت
              </button>
            </footer>
          </>
        ) : (
          <div className="goldbox-empty">
            <div className="goldbox-empty-title">گلد باکس خالی است</div>
            <p>زیورآلات مورد علاقه‌تان را اضافه کنید.</p>
            <button type="button" className="gold-btn" onClick={resetAndClose}>
              مشاهده محصولات
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
