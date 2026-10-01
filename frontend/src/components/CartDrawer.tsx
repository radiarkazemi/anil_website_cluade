import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { useToast } from '../store/toastStore';
import { calcPrice, faNum, faPrice, faWeight } from '../utils/format';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';
import type { Product } from '../types';
import { IconGoldBox, IconShoppingBag } from './icons';

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

type CartLine = {
  productId: string;
  qty: number;
  product: Product;
  gold: number;
  fee: number;
  tax: number;
  price: number;
};

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

  const cartIds = cart.map((c) => c.productId).join(',');
  const { data } = useQuery({
    queryKey: ['products-cart', cartIds],
    queryFn: () =>
      api
        .products({
          ids: cartIds,
          page_size: String(Math.max(cart.length, 1)),
        })
        .then((r) => r.data.results),
    enabled: cartOpen && cart.length > 0 && Boolean(cartIds),
    staleTime: 60_000,
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
      const w = p.weight_g != null ? Number(p.weight_g) : 0;
      if (!w) return null;
      const pr = calcPrice(w, gp, Number(p.fee_ratio), p.stone_value);
      return {
        ...c,
        product: p,
        gold: pr.gold,
        fee: pr.fee,
        tax: pr.tax,
        price: pr.total,
      };
    })
    .filter(Boolean) as CartLine[];

  const sumGold = cartItems.reduce((s, c) => s + c.gold * c.qty, 0);
  const sumFee = cartItems.reduce((s, c) => s + c.fee * c.qty, 0);
  const sumTax = cartItems.reduce((s, c) => s + c.tax * c.qty, 0);
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
      setError('سبد خرید خالی است.');
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
      <aside className="goldbox-panel handoff-cart" role="dialog" aria-label="سبد خرید">
        <header className="goldbox-head">
          <div className="goldbox-head-title">
            <span className="goldbox-head-ico" aria-hidden>
              <IconGoldBox size={22} />
            </span>
            <div>
              <div className="goldbox-title">سبد خرید</div>
              <div className="goldbox-sub">
                {step === 'cart' && (totalQty ? `${faNum(totalQty)} قلم` : 'خالی')}
                {step === 'checkout' && 'تأیید و پرداخت'}
              </div>
            </div>
          </div>
          <button type="button" className="goldbox-close" onClick={resetAndClose} aria-label="بستن">
            ✕
          </button>
        </header>

        {step === 'checkout' ? (
          <div className="goldbox-body handoff-checkout">
            <div className="handoff-checkout-steps" aria-label="مراحل خرید">
              <span className="is-done">۱. سبد</span>
              <span className="is-active">۲. تأیید</span>
              <span>۳. پرداخت</span>
            </div>
            <div className="goldbox-sum">
              مبلغ قابل پرداخت: <strong>{faPrice(subtotal)}</strong> تومان
            </div>
            <div className="goldbox-profile-box">
              <div className="goldbox-profile-title">اطلاعات خریدار</div>
              <div>{user?.full_name}</div>
              <div dir="ltr">{user?.phone}</div>
              <div>{user?.email}</div>
              <div>
                {user?.city} — {user?.address}
              </div>
              <div dir="ltr">کد پستی: {user?.postal_code}</div>
              <button type="button" className="text-link" onClick={goCompleteProfile}>
                ویرایش در پروفایل
              </button>
            </div>
            <div className="handoff-cart-summary">
              <div className="handoff-cart-summary-title">خلاصه سفارش</div>
              <div className="handoff-cart-summary-row">
                <span>مجموع قیمت طلا</span>
                <span>{faPrice(sumGold)} تومان</span>
              </div>
              <div className="handoff-cart-summary-row">
                <span>مجموع اجرت ساخت</span>
                <span>{faPrice(sumFee)} تومان</span>
              </div>
              <div className="handoff-cart-summary-row">
                <span>مالیات بر ارزش افزوده</span>
                <span>{faPrice(sumTax)} تومان</span>
              </div>
              <div className="handoff-cart-summary-total">
                <span>مبلغ قابل پرداخت</span>
                <strong>{faPrice(subtotal)} تومان</strong>
              </div>
            </div>
            <textarea
              className="input"
              placeholder="یادداشت سفارش (اختیاری)"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {error && <div className="goldbox-error">{error}</div>}
            <button type="button" className="gold-btn handoff-cart-cta" disabled={busy} onClick={handleCheckout}>
              {busy ? 'در حال ثبت…' : 'ثبت سفارش و پرداخت'}
            </button>
            <button type="button" className="outline-btn" onClick={() => setStep('cart')}>
              بازگشت به سبد
            </button>
          </div>
        ) : cartItems.length > 0 ? (
          <>
            <div className="goldbox-list">
              {cartItems.map((c) => {
                const w = Number(c.product.weight_g);
                return (
                  <div key={c.productId} className="goldbox-item handoff-cart-item">
                    <div className="goldbox-thumb">
                      {c.product.primary_image || c.product.images?.[0]?.image ? (
                        <img src={c.product.primary_image || c.product.images![0].image} alt="" />
                      ) : null}
                    </div>
                    <div className="goldbox-item-body">
                      <div className="goldbox-item-name">{c.product.name}</div>
                      <div className="goldbox-item-meta">
                        وزن: {faWeight(w)} گرم
                        <span aria-hidden> · </span>
                        اجرت: {faPrice(c.fee)} تومان
                      </div>
                      <div className="goldbox-item-price">{faPrice(c.price * c.qty)} تومان</div>
                      <div className="goldbox-item-row">
                        <div className="pd-qty compact">
                          <button type="button" onClick={() => updateQty(c.productId, c.qty - 1)} aria-label="کاهش">
                            −
                          </button>
                          <div>{faNum(c.qty)}</div>
                          <button type="button" onClick={() => updateQty(c.productId, c.qty + 1)} aria-label="افزایش">
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="goldbox-remove"
                          onClick={() => removeFromCart(c.productId)}
                          aria-label="حذف"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="handoff-cart-rate-note">
                قیمت‌ها بر اساس نرخ لحظه‌ای طلا محاسبه می‌شوند و با تغییر نرخ به‌روز می‌گردند.
              </div>

              <div className="handoff-cart-summary">
                <div className="handoff-cart-summary-title">خلاصه سفارش</div>
                <div className="handoff-cart-summary-row">
                  <span>مجموع قیمت طلا</span>
                  <span>{faPrice(sumGold)} تومان</span>
                </div>
                <div className="handoff-cart-summary-row">
                  <span>مجموع اجرت ساخت</span>
                  <span>{faPrice(sumFee)} تومان</span>
                </div>
                <div className="handoff-cart-summary-row">
                  <span>مالیات بر ارزش افزوده</span>
                  <span>{faPrice(sumTax)} تومان</span>
                </div>
                <div className="handoff-cart-summary-total">
                  <span>مبلغ قابل پرداخت</span>
                  <strong>{faPrice(subtotal)} تومان</strong>
                </div>
              </div>

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
            </div>
            <footer className="goldbox-foot handoff-cart-foot">
              <div className="handoff-cart-foot-price">
                <span>مبلغ قابل پرداخت</span>
                <strong>{faPrice(subtotal)} تومان</strong>
              </div>
              <button type="button" className="gold-btn handoff-cart-cta" onClick={handleContinue}>
                ادامه خرید
                <span aria-hidden>‹</span>
              </button>
            </footer>
          </>
        ) : (
          <div className="goldbox-empty handoff-cart-empty">
            <div className="handoff-cart-empty-ico" aria-hidden>
              <IconShoppingBag size={48} />
            </div>
            <div className="goldbox-empty-title">سبد خرید شما خالی است</div>
            <p>محصولات مورد علاقه‌تان را به سبد اضافه کنید و از زیبایی طلا لذت ببرید.</p>
            <button
              type="button"
              className="gold-btn handoff-cart-cta"
              onClick={() => {
                resetAndClose();
                nav('/products');
              }}
            >
              مشاهده محصولات
              <span aria-hidden>‹</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
