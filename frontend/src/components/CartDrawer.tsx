import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useUI } from '../store/uiStore';
import { useToast } from '../store/toastStore';
import { calcPrice, faNum, faPrice } from '../utils/format';
import type { Product } from '../types';

type Step = 'cart' | 'checkout' | 'pay';

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

  const { data } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => api.products({ page_size: '200' }).then((r) => r.data.results),
    staleTime: 60000,
  });
  const { data: gatewaysData } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: () => api.paymentGateways().then((r) => r.data),
    staleTime: 120000,
  });

  const products = data ?? [];
  const gateways = gatewaysData?.gateways ?? [
    { code: 'zarinpal', label: 'زرین‌پال' },
    { code: 'idpay', label: 'آیدی‌پی' },
  ];

  const [step, setStep] = useState<Step>('cart');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [gateway, setGateway] = useState('zarinpal');
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: user?.address || '',
    city: user?.city || '',
    postal_code: user?.postal_code || '',
    note: '',
  });

  const cartItems = cart.map((c) => {
    const p = products.find((x) => x.id === c.productId);
    if (!p) return null;
    const pr = calcPrice(Number(p.weight_g), gp, Number(p.fee_ratio), p.stone_value);
    return { ...c, product: p, price: pr.total };
  }).filter(Boolean) as { productId: string; qty: number; product: Product; price: number }[];

  const subtotal = cartItems.reduce((s, c) => s + c.price * c.qty, 0);
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);

  const resetAndClose = () => {
    setStep('cart');
    setError('');
    setOrderNumber('');
    closeCart();
  };

  const handleCheckout = async () => {
    if (busy) return;
    if (!form.full_name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('نام، موبایل و آدرس الزامی است.');
      return;
    }
    if (!cart.length) {
      setError('گلد باکس خالی است.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data: order } = await api.createOrder({
        ...form,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        items: cart.map((c) => ({ product_id: c.productId, qty: c.qty })),
      });
      clearCart();
      setOrderNumber(order.order_number);
      setStep('pay');
      toast(`سفارش ${order.order_number} ثبت شد`);
    } catch (e: any) {
      const d = e.response?.data;
      const parts: string[] = [];
      if (typeof d?.detail === 'string') parts.push(d.detail);
      if (d && typeof d === 'object') {
        for (const [k, v] of Object.entries(d)) {
          if (k === 'detail') continue;
          const msg = Array.isArray(v) ? v.join('، ') : typeof v === 'string' ? v : JSON.stringify(v);
          parts.push(`${k}: ${msg}`);
        }
      }
      setError(parts.join(' | ') || (e.response?.status === 429
        ? 'تعداد درخواست زیاد است — چند ثانیه صبر کنید.'
        : 'ثبت سفارش ناموفق بود.'));
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async () => {
    if (!orderNumber) return;
    setBusy(true);
    setError('');
    try {
      const { data: pay } = await api.payOrder(orderNumber, { gateway, phone: form.phone.trim() });
      if (pay.sandbox && (pay.authority?.startsWith('SANDBOX') || pay.authority?.startsWith('ID-'))) {
        await api.sandboxConfirmPayment(orderNumber);
        toast('پرداخت آزمایشی با موفقیت تأیید شد');
        resetAndClose();
        return;
      }
      if (pay.payment_url) {
        window.location.href = pay.payment_url;
        return;
      }
      setError('لینک پرداخت دریافت نشد.');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'خطا در اتصال به درگاه');
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
          <div>
            <div className="goldbox-title">گلد باکس</div>
            <div className="goldbox-sub">
              {step === 'cart' && `${faNum(totalQty)} قلم`}
              {step === 'checkout' && 'اطلاعات ارسال'}
              {step === 'pay' && 'پرداخت امن'}
            </div>
          </div>
          <button type="button" className="goldbox-close" onClick={resetAndClose}>✕</button>
        </header>

        {step === 'pay' ? (
          <div className="goldbox-body">
            <div className="goldbox-success">
              <div className="goldbox-success-title">سفارش ثبت شد</div>
              <div className="goldbox-order-no">{orderNumber}</div>
              <p>درگاه پرداخت ایرانی را انتخاب کنید.</p>
            </div>
            <div className="goldbox-gateways">
              {gateways.map((g) => (
                <label key={g.code} className={`goldbox-gw${gateway === g.code ? ' on' : ''}`}>
                  <input
                    type="radio"
                    name="gw"
                    checked={gateway === g.code}
                    onChange={() => setGateway(g.code)}
                  />
                  {g.label}
                </label>
              ))}
            </div>
            {error && <div className="goldbox-error">{error}</div>}
            <button type="button" className="gold-btn" disabled={busy} onClick={handlePay}>
              {busy ? '…' : 'پرداخت آنلاین'}
            </button>
            <Link to="/account" className="outline-btn" style={{ textAlign: 'center' }} onClick={resetAndClose}>
              مشاهده در حساب من
            </Link>
          </div>
        ) : step === 'checkout' ? (
          <div className="goldbox-body">
            <div className="goldbox-sum">جمع قابل پرداخت: <strong>{faPrice(subtotal)}</strong> تومان</div>
            <input className="input" placeholder="نام و نام خانوادگی *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input className="input" placeholder="موبایل *" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="input" placeholder="ایمیل" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input" placeholder="شهر" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className="input" placeholder="کد پستی" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
            <textarea className="input" placeholder="آدرس کامل *" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <textarea className="input" placeholder="یادداشت سفارش" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            {error && <div className="goldbox-error">{error}</div>}
            <button type="button" className="gold-btn" disabled={busy} onClick={handleCheckout}>
              {busy ? 'در حال ثبت…' : 'ثبت و ادامه پرداخت'}
            </button>
            <button type="button" className="outline-btn" onClick={() => setStep('cart')}>بازگشت به گلد باکس</button>
          </div>
        ) : cartItems.length > 0 ? (
          <>
            <div className="goldbox-list">
              {cartItems.map((c) => (
                <div key={c.productId} className="goldbox-item">
                  <div className="goldbox-thumb">
                    {(c.product.primary_image || c.product.images?.[0]?.image) ? (
                      <img src={c.product.primary_image || c.product.images![0].image} alt="" />
                    ) : null}
                  </div>
                  <div className="goldbox-item-body">
                    <div className="goldbox-item-name">{c.product.name}</div>
                    <div className="goldbox-item-meta">{c.product.category_name} · {faNum(Number(c.product.weight_g))} گرم</div>
                    <div className="goldbox-item-row">
                      <div className="pd-qty compact">
                        <button type="button" onClick={() => updateQty(c.productId, c.qty - 1)}>−</button>
                        <div>{faNum(c.qty)}</div>
                        <button type="button" onClick={() => updateQty(c.productId, c.qty + 1)}>+</button>
                      </div>
                      <div className="goldbox-item-price">{faPrice(c.price * c.qty)}</div>
                    </div>
                  </div>
                  <button type="button" className="goldbox-remove" onClick={() => removeFromCart(c.productId)}>✕</button>
                </div>
              ))}
            </div>
            <footer className="goldbox-foot">
              <div className="goldbox-total-row">
                <span>جمع کل ({faNum(totalQty)} قلم)</span>
                <strong>{faPrice(subtotal)} <small>تومان</small></strong>
              </div>
              <p className="goldbox-note">قیمت بر اساس نرخ لحظه‌ای طلا · پرداخت از طریق درگاه‌های ایرانی</p>
              <button type="button" className="gold-btn" onClick={() => setStep('checkout')}>ادامه خرید و پرداخت</button>
            </footer>
          </>
        ) : (
          <div className="goldbox-empty">
            <div className="goldbox-empty-title">گلد باکس خالی است</div>
            <p>زیورآلات مورد علاقه‌تان را اضافه کنید.</p>
            <button type="button" className="gold-btn" onClick={resetAndClose}>مشاهده محصولات</button>
          </div>
        )}
      </aside>
    </div>
  );
}
