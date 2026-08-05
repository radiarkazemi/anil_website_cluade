import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { faNum, faPrice } from '../utils/format';
import type { Order } from '../types';

const STATUS_FA: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  processing: 'در حال پردازش',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  refunded: 'مرجوع‌شده',
};

export function Account() {
  const tokens = useStore((s) => s.tokens);
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const logout = useStore((s) => s.logout);
  const toast = useToast((s) => s.show);
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const paidFlash = params.get('paid');

  const [tab, setTab] = useState<'orders' | 'track' | 'profile'>('orders');
  const [trackForm, setTrackForm] = useState({ order_number: '', phone: '' });
  const [tracked, setTracked] = useState<Order | null>(null);
  const [trackErr, setTrackErr] = useState('');

  useEffect(() => {
    if (!tokens) return;
    if (!user) {
      api.profile('client').then((r) => setUser(r.data)).catch(() => logout());
    }
  }, [tokens, user, setUser, logout]);

  useEffect(() => {
    if (paidFlash) {
      toast(`پرداخت سفارش ${paidFlash} با موفقیت ثبت شد`);
      setTab('orders');
    }
  }, [paidFlash, toast]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const r = await api.myOrders();
      const d = r.data as any;
      return Array.isArray(d) ? d : d.results || [];
    },
    enabled: !!tokens,
  });

  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    address: user?.address || '',
    city: user?.city || '',
    postal_code: user?.postal_code || '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        address: user.address || '',
        city: user.city || '',
        postal_code: user.postal_code || '',
      });
    }
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: () => api.updateProfile(profile),
    onSuccess: (r) => {
      setUser(r.data);
      toast('پروفایل ذخیره شد');
    },
    onError: () => toast('خطا در ذخیره پروفایل'),
  });

  const payAgain = useMutation({
    mutationFn: async (order: Order) => {
      const r = await api.payOrder(order.order_number, {
        gateway: order.payment_gateway || 'zarinpal',
        phone: order.phone,
      });
      return r.data;
    },
    onSuccess: async (data) => {
      if (data.sandbox && data.authority?.startsWith('SANDBOX')) {
        await api.sandboxConfirmPayment(data.order_number);
        toast('پرداخت آزمایشی تأیید شد');
        qc.invalidateQueries({ queryKey: ['my-orders'] });
        return;
      }
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    },
    onError: (e: any) => toast(e.response?.data?.detail || 'خطا در شروع پرداخت'),
  });

  const doTrack = async () => {
    setTrackErr('');
    setTracked(null);
    try {
      const r = await api.trackOrder(trackForm);
      setTracked(r.data);
    } catch (e: any) {
      setTrackErr(e.response?.data?.detail || 'سفارش یافت نشد');
    }
  };

  if (!tokens) return <Navigate to="/login" replace />;

  return (
    <div className="container account-page">
      <div className="account-head">
        <div>
          <div className="section-eyebrow">حساب کاربری آنیل</div>
          <h1 className="section-title tight">{user?.full_name || 'حساب من'}</h1>
          <p className="content-excerpt">{user?.phone}</p>
        </div>
        <button
          type="button"
          className="outline-btn"
          onClick={() => {
            if (tokens.refresh) api.logout(tokens.refresh, 'client').catch(() => {});
            logout();
          }}
        >
          خروج
        </button>
      </div>

      <div className="account-tabs">
        <button type="button" className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>سفارش‌ها و رهگیری</button>
        <button type="button" className={tab === 'track' ? 'active' : ''} onClick={() => setTab('track')}>پیگیری با کد</button>
        <button type="button" className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>پروفایل</button>
      </div>

      {tab === 'orders' && (
        <div className="account-panel">
          {isLoading ? <p>…</p> : orders.length === 0 ? (
            <div className="account-empty">
              <p>هنوز سفارشی ندارید.</p>
              <Link to="/products" className="gold-btn">مشاهده محصولات</Link>
            </div>
          ) : (
            <div className="order-list">
              {orders.map((o: Order) => (
                <article key={o.id} className="order-card">
                  <div className="order-card-top">
                    <div>
                      <div className="order-no">{o.order_number}</div>
                      <div className="order-date">{new Date(o.created_at).toLocaleString('fa-IR')}</div>
                    </div>
                    <span className={`status-badge status-${o.status}`}>{STATUS_FA[o.status] || o.status}</span>
                  </div>
                  <ul className="order-items">
                    {o.items?.map((it) => (
                      <li key={it.id}>{it.product_name} × {faNum(it.qty)} — {faPrice(it.line_total)}</li>
                    ))}
                  </ul>
                  <div className="order-card-foot">
                    <div>
                      <div className="order-total">{faPrice(o.total)} تومان</div>
                      {o.tracking_code && <div className="order-track-code">کد پیگیری پست: {o.tracking_code}</div>}
                      {o.payment_ref_id && <div className="order-track-code">رسید پرداخت: {o.payment_ref_id}</div>}
                    </div>
                    {o.status === 'pending' && (
                      <button type="button" className="gold-btn" disabled={payAgain.isPending} onClick={() => payAgain.mutate(o)}>
                        پرداخت آنلاین
                      </button>
                    )}
                  </div>
                  <div className="order-timeline">
                    {['pending', 'paid', 'processing', 'shipped', 'delivered'].map((s, i, arr) => {
                      const done = arr.indexOf(o.status) >= i || (o.status === 'paid' && i <= 1);
                      const active = o.status === s;
                      return (
                        <div key={s} className={`ot-step${done || active ? ' on' : ''}${active ? ' now' : ''}`}>
                          <span />
                          {STATUS_FA[s]}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'track' && (
        <div className="account-panel">
          <p className="content-excerpt">با شماره سفارش و موبایل ثبت‌شده، وضعیت را ببینید.</p>
          <div className="form-grid" style={{ maxWidth: 480 }}>
            <label>
              <span>شماره سفارش</span>
              <input className="input" value={trackForm.order_number} onChange={(e) => setTrackForm({ ...trackForm, order_number: e.target.value })} placeholder="AG-1001" />
            </label>
            <label>
              <span>موبایل</span>
              <input className="input" dir="ltr" value={trackForm.phone} onChange={(e) => setTrackForm({ ...trackForm, phone: e.target.value })} />
            </label>
          </div>
          {trackErr && <p style={{ color: 'var(--down)', marginTop: 10 }}>{trackErr}</p>}
          <button type="button" className="gold-btn" style={{ marginTop: 14 }} onClick={doTrack}>پیگیری</button>
          {tracked && (
            <div className="order-card" style={{ marginTop: 20 }}>
              <div className="order-card-top">
                <div className="order-no">{tracked.order_number}</div>
                <span className={`status-badge status-${tracked.status}`}>{STATUS_FA[tracked.status]}</span>
              </div>
              <div className="order-total">{faPrice(tracked.total)} تومان</div>
              {tracked.tracking_code && <div className="order-track-code">کد رهگیری: {tracked.tracking_code}</div>}
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="account-panel">
          <div className="form-grid" style={{ maxWidth: 560 }}>
            <label>
              <span>نام</span>
              <input className="input" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </label>
            <label>
              <span>ایمیل</span>
              <input className="input" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </label>
            <label className="full">
              <span>آدرس</span>
              <textarea className="input" rows={3} value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </label>
            <label>
              <span>شهر</span>
              <input className="input" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
            </label>
            <label>
              <span>کد پستی</span>
              <input className="input" value={profile.postal_code} onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })} />
            </label>
          </div>
          <button type="button" className="gold-btn" style={{ marginTop: 14 }} disabled={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
            ذخیره پروفایل
          </button>
        </div>
      )}
    </div>
  );
}
