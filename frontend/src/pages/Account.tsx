import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { faNum, faPrice } from '../utils/format';
import { isProfileReady, profileGapMessage } from '../utils/profileGate';
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
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const paidFlash = params.get('paid');
  const completeMode = params.get('complete') === '1';
  const tabParam = params.get('tab');

  const [tab, setTab] = useState<'orders' | 'track' | 'profile'>(
    tabParam === 'profile' || tabParam === 'track' || tabParam === 'orders'
      ? tabParam
      : completeMode
        ? 'profile'
        : 'orders',
  );
  const [trackForm, setTrackForm] = useState({ order_number: '', phone: '' });
  const [tracked, setTracked] = useState<Order | null>(null);
  const [trackErr, setTrackErr] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoEmail, setDemoEmail] = useState('');

  useEffect(() => {
    if (tabParam === 'profile' || tabParam === 'track' || tabParam === 'orders') {
      setTab(tabParam);
    } else if (completeMode) {
      setTab('profile');
    }
  }, [tabParam, completeMode]);

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
    national_code: user?.national_code || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    postal_code: user?.postal_code || '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        national_code: user.national_code || '',
        phone: user.phone || '',
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
      toast(isProfileReady(r.data) ? 'پروفایل کامل شد — می‌توانید خرید کنید' : 'پروفایل ذخیره شد');
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const msg =
        d && typeof d === 'object'
          ? Object.values(d)
              .flat()
              .map(String)[0]
          : 'خطا در ذخیره پروفایل';
      toast(String(msg || 'خطا در ذخیره پروفایل'));
    },
  });

  const sendPhone = useMutation({
    mutationFn: () => api.sendPhoneOtp(),
    onSuccess: (r) => {
      if (r.data.demo_code) setDemoPhone(r.data.demo_code);
      toast(r.data.demo_code ? `کد آزمایشی موبایل: ${r.data.demo_code}` : r.data.detail);
    },
    onError: (e: any) => toast(e.response?.data?.detail || 'ارسال کد موبایل ناموفق'),
  });

  const confirmPhone = useMutation({
    mutationFn: () => api.confirmPhoneOtp(phoneCode),
    onSuccess: (r) => {
      setUser(r.data.user);
      setPhoneCode('');
      setDemoPhone('');
      toast(r.data.detail);
    },
    onError: (e: any) => toast(e.response?.data?.detail || 'تأیید موبایل ناموفق'),
  });

  const sendEmail = useMutation({
    mutationFn: () => api.sendEmailOtp(),
    onSuccess: (r) => {
      if (r.data.demo_code) setDemoEmail(r.data.demo_code);
      toast(r.data.demo_code ? `کد آزمایشی ایمیل: ${r.data.demo_code}` : r.data.detail);
    },
    onError: (e: any) => toast(e.response?.data?.detail || 'ارسال کد ایمیل ناموفق'),
  });

  const confirmEmail = useMutation({
    mutationFn: () => api.confirmEmailOtp(emailCode),
    onSuccess: (r) => {
      setUser(r.data.user);
      setEmailCode('');
      setDemoEmail('');
      toast(r.data.detail);
    },
    onError: (e: any) => toast(e.response?.data?.detail || 'تأیید ایمیل ناموفق'),
  });

  const payAgain = useMutation({
    mutationFn: async (order: Order) => order,
    onSuccess: (order) => {
      nav(`/payment/demo/${order.order_number}`);
    },
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

  const switchTab = (t: 'orders' | 'track' | 'profile') => {
    setTab(t);
    const next = new URLSearchParams(params);
    next.set('tab', t);
    if (t !== 'profile') next.delete('complete');
    setParams(next, { replace: true });
  };

  if (!tokens) return <Navigate to="/login" replace />;

  const ready = isProfileReady(user);

  return (
    <div className="container account-page">
      <div className="account-head">
        <div>
          <div className="section-eyebrow">حساب کاربری آنیل</div>
          <h1 className="section-title tight">{user?.full_name || 'حساب من'}</h1>
          <p className="content-excerpt">{user?.phone}</p>
          {!ready && (
            <p className="profile-gate-banner">{profileGapMessage(user)}</p>
          )}
          {ready && <p className="profile-ready-banner">هویت تأیید شد — می‌توانید به گلد باکس اضافه کنید.</p>}
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
        <button type="button" className={tab === 'orders' ? 'active' : ''} onClick={() => switchTab('orders')}>
          سفارش‌ها و رهگیری
        </button>
        <button type="button" className={tab === 'track' ? 'active' : ''} onClick={() => switchTab('track')}>
          پیگیری با کد
        </button>
        <button type="button" className={tab === 'profile' ? 'active' : ''} onClick={() => switchTab('profile')}>
          پروفایل و تأیید هویت
        </button>
      </div>

      {tab === 'orders' && (
        <div className="account-panel">
          {isLoading ? (
            <p>…</p>
          ) : orders.length === 0 ? (
            <div className="account-empty">
              <p>هنوز سفارشی ندارید.</p>
              <Link to="/products" className="gold-btn">
                مشاهده محصولات
              </Link>
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
                      <li key={it.id}>
                        {it.product_name} × {faNum(it.qty)} — {faPrice(it.line_total)}
                      </li>
                    ))}
                  </ul>
                  <div className="order-card-foot">
                    <div>
                      <div className="order-total">{faPrice(o.total)} تومان</div>
                      {o.tracking_code && <div className="order-track-code">کد پیگیری پست: {o.tracking_code}</div>}
                      {o.payment_ref_id && <div className="order-track-code">رسید پرداخت: {o.payment_ref_id}</div>}
                    </div>
                    {o.status === 'pending' && (
                      <button type="button" className="gold-btn" onClick={() => payAgain.mutate(o)}>
                        پرداخت آزمایشی
                      </button>
                    )}
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
              <input
                className="input"
                value={trackForm.order_number}
                onChange={(e) => setTrackForm({ ...trackForm, order_number: e.target.value })}
                placeholder="AG-…"
              />
            </label>
            <label>
              <span>موبایل</span>
              <input
                className="input"
                dir="ltr"
                value={trackForm.phone}
                onChange={(e) => setTrackForm({ ...trackForm, phone: e.target.value })}
              />
            </label>
          </div>
          {trackErr && <p style={{ color: 'var(--down)', marginTop: 10 }}>{trackErr}</p>}
          <button type="button" className="gold-btn" style={{ marginTop: 14 }} onClick={doTrack}>
            پیگیری
          </button>
          {tracked && (
            <div className="order-card" style={{ marginTop: 20 }}>
              <div className="order-card-top">
                <div className="order-no">{tracked.order_number}</div>
                <span className={`status-badge status-${tracked.status}`}>{STATUS_FA[tracked.status]}</span>
              </div>
              <div className="order-total">{faPrice(tracked.total)} تومان</div>
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="account-panel">
          {completeMode && (
            <div className="profile-complete-callout">
              برای افزودن به گلد باکس، اطلاعات زیر را کامل کنید و موبایل/ایمیل را تأیید کنید.
            </div>
          )}

          <div className="verify-grid">
            <div className={`verify-card${user?.phone_verified ? ' ok' : ''}`}>
              <div className="verify-card-head">
                <strong>تأیید موبایل (ایران)</strong>
                <span>{user?.phone_verified ? 'تأیید شد' : 'در انتظار'}</span>
              </div>
              <div dir="ltr" className="verify-target">{user?.phone}</div>
              {!user?.phone_verified && (
                <>
                  <button type="button" className="outline-btn" disabled={sendPhone.isPending} onClick={() => sendPhone.mutate()}>
                    ارسال کد پیامکی
                  </button>
                  {demoPhone && <div className="demo-otp-hint">کد آزمایشی: {demoPhone}</div>}
                  <div className="verify-row">
                    <input
                      className="input"
                      dir="ltr"
                      placeholder="کد ۶ رقمی"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                    />
                    <button type="button" className="gold-btn" disabled={confirmPhone.isPending || !phoneCode} onClick={() => confirmPhone.mutate()}>
                      تأیید
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className={`verify-card${user?.email_verified ? ' ok' : ''}`}>
              <div className="verify-card-head">
                <strong>تأیید ایمیل</strong>
                <span>{user?.email_verified ? 'تأیید شد' : 'در انتظار'}</span>
              </div>
              <div dir="ltr" className="verify-target">{user?.email || '—'}</div>
              {!user?.email_verified && (
                <>
                  <button type="button" className="outline-btn" disabled={sendEmail.isPending} onClick={() => sendEmail.mutate()}>
                    ارسال کد ایمیل
                  </button>
                  {demoEmail && <div className="demo-otp-hint">کد آزمایشی: {demoEmail}</div>}
                  <div className="verify-row">
                    <input
                      className="input"
                      dir="ltr"
                      placeholder="کد ۶ رقمی"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                    />
                    <button type="button" className="gold-btn" disabled={confirmEmail.isPending || !emailCode} onClick={() => confirmEmail.mutate()}>
                      تأیید
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="form-grid" style={{ maxWidth: 640, marginTop: 22 }}>
            <label>
              <span>نام و نام خانوادگی</span>
              <input className="input" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </label>
            <label>
              <span>موبایل</span>
              <input className="input" dir="ltr" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </label>
            <label>
              <span>ایمیل</span>
              <input className="input" dir="ltr" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </label>
            <label>
              <span>کد ملی</span>
              <input className="input" dir="ltr" value={profile.national_code} onChange={(e) => setProfile({ ...profile, national_code: e.target.value })} />
            </label>
            <label>
              <span>شهر</span>
              <input className="input" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
            </label>
            <label>
              <span>کد پستی</span>
              <input className="input" dir="ltr" value={profile.postal_code} onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })} />
            </label>
            <label className="full">
              <span>آدرس</span>
              <textarea className="input" rows={3} value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
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
