import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { useOrdersEnabled } from '../hooks/useOrdersEnabled';
import { faNum, faPrice } from '../utils/format';
import { getProfileGaps, isProfileReady, PROFILE_FIELD_LABELS, profileGapMessage } from '../utils/profileGate';
import type { Order, WishlistItem } from '../types';

const STATUS_FA: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  processing: 'در حال پردازش',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  refunded: 'مرجوع‌شده',
};

const ORDER_PIPELINE = ['pending', 'paid', 'processing', 'shipped', 'delivered'] as const;

type Tab = 'overview' | 'orders' | 'wishlist' | 'profile' | 'security' | 'track';

function orderSteps(status: string) {
  if (status === 'cancelled' || status === 'refunded') {
    return ORDER_PIPELINE.map((s) => ({ key: s, on: false, now: false }));
  }
  const idx = ORDER_PIPELINE.indexOf(status as (typeof ORDER_PIPELINE)[number]);
  const active = idx < 0 ? 0 : idx;
  return ORDER_PIPELINE.map((s, i) => ({
    key: s,
    on: i <= active,
    now: i === active,
  }));
}

function errMsg(e: unknown, fallback: string) {
  const d = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!d || typeof d !== 'object') return fallback;
  if (typeof d.detail === 'string') return d.detail;
  const first = Object.values(d)
    .flat()
    .map(String)[0];
  return first || fallback;
}

export function Account() {
  const tokens = useStore((s) => s.tokens);
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const logout = useStore((s) => s.logout);
  const addToCart = useStore((s) => s.addToCart);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { ordersEnabled, salesClosedMessage } = useOrdersEnabled();
  const [params, setParams] = useSearchParams();
  const paidFlash = params.get('paid');
  const completeMode = params.get('complete') === '1';
  const tabParam = params.get('tab');

  const validTabs: Tab[] = ['overview', 'orders', 'wishlist', 'profile', 'security', 'track'];
  const initialTab: Tab =
    tabParam && validTabs.includes(tabParam as Tab)
      ? (tabParam as Tab)
      : completeMode
        ? 'profile'
        : 'overview';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [trackForm, setTrackForm] = useState({ order_number: '', phone: '' });
  const [tracked, setTracked] = useState<Order | null>(null);
  const [trackErr, setTrackErr] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [pw, setPw] = useState({ old_password: '', new_password: '', confirm: '' });

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as Tab)) setTab(tabParam as Tab);
    else if (completeMode) setTab('profile');
  }, [tabParam, completeMode]);

  useEffect(() => {
    if (!tokens) return;
    if (!user) {
      api
        .profile('client')
        .then((r) => setUser(r.data))
        .catch((err: { response?: { status?: number } }) => {
          const status = err?.response?.status;
          if (status === 401 || status === 403) logout();
        });
    }
  }, [tokens, user, setUser, logout]);

  useEffect(() => {
    if (paidFlash) {
      toast(`پرداخت سفارش ${paidFlash} با موفقیت ثبت شد`);
      setTab('orders');
    }
  }, [paidFlash, toast]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const r = await api.myOrders();
      const d = r.data as Order[] | { results?: Order[] };
      return Array.isArray(d) ? d : d.results || [];
    },
    enabled: !!tokens,
  });

  const { data: wishlist = [], isLoading: wishLoading } = useQuery({
    queryKey: ['my-wishlist'],
    queryFn: async () => {
      const r = await api.wishlist();
      const d = r.data as WishlistItem[] | { results?: WishlistItem[] };
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

  const gaps = getProfileGaps(user);
  const completeness = Math.round(((9 - Math.min(gaps.length, 9)) / 9) * 100);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const stats = useMemo(() => {
    const paidLike = orders.filter((o) => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status));
    const pending = orders.filter((o) => o.status === 'pending').length;
    const spend = paidLike.reduce((a, o) => a + Number(o.total || 0), 0);
    return {
      orders: orders.length,
      pending,
      spend,
      wishlist: wishlist.length,
    };
  }, [orders, wishlist]);

  const saveProfile = useMutation({
    mutationFn: () => api.updateProfile(profile),
    onSuccess: (r) => {
      setUser(r.data);
      toast(isProfileReady(r.data) ? 'پروفایل کامل شد — می‌توانید خرید کنید' : 'پروفایل ذخیره شد');
    },
    onError: (e) => toast(errMsg(e, 'خطا در ذخیره پروفایل')),
  });

  const sendPhone = useMutation({
    mutationFn: () => api.sendPhoneOtp(),
    onSuccess: (r) => {
      if (r.data.demo_code) setDemoPhone(r.data.demo_code);
      toast(r.data.demo_code ? `کد آزمایشی موبایل: ${r.data.demo_code}` : r.data.detail);
    },
    onError: (e) => toast(errMsg(e, 'ارسال کد موبایل ناموفق')),
  });

  const confirmPhone = useMutation({
    mutationFn: () => api.confirmPhoneOtp(phoneCode),
    onSuccess: (r) => {
      setUser(r.data.user);
      setPhoneCode('');
      setDemoPhone('');
      toast(r.data.detail);
    },
    onError: (e) => toast(errMsg(e, 'تأیید موبایل ناموفق')),
  });

  const sendEmail = useMutation({
    mutationFn: () => api.sendEmailOtp(),
    onSuccess: (r) => {
      if (r.data.demo_code) setDemoEmail(r.data.demo_code);
      toast(r.data.demo_code ? `کد آزمایشی ایمیل: ${r.data.demo_code}` : r.data.detail);
    },
    onError: (e) => toast(errMsg(e, 'ارسال کد ایمیل ناموفق')),
  });

  const confirmEmail = useMutation({
    mutationFn: () => api.confirmEmailOtp(emailCode),
    onSuccess: (r) => {
      setUser(r.data.user);
      setEmailCode('');
      setDemoEmail('');
      toast(r.data.detail);
    },
    onError: (e) => toast(errMsg(e, 'تأیید ایمیل ناموفق')),
  });

  const changePassword = useMutation({
    mutationFn: () => api.changePassword(pw.old_password, pw.new_password),
    onSuccess: (r) => {
      setPw({ old_password: '', new_password: '', confirm: '' });
      toast(r.data.detail || 'رمز عبور تغییر کرد');
    },
    onError: (e) => toast(errMsg(e, 'تغییر رمز ناموفق')),
  });

  const removeWish = useMutation({
    mutationFn: (id: string) => api.removeWishlist(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-wishlist'] });
      toast('از علاقه‌مندی‌ها حذف شد');
    },
    onError: (e) => toast(errMsg(e, 'حذف ناموفق')),
  });

  const payAgain = useMutation({
    mutationFn: async (order: Order) => order,
    onSuccess: (order) => nav(`/payment/demo/${order.order_number}`),
  });

  const doTrack = async () => {
    setTrackErr('');
    setTracked(null);
    try {
      const r = await api.trackOrder(trackForm);
      setTracked(r.data);
    } catch (e) {
      setTrackErr(errMsg(e, 'سفارش یافت نشد'));
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    const next = new URLSearchParams(params);
    next.set('tab', t);
    if (t !== 'profile') next.delete('complete');
    setParams(next, { replace: true });
  };

  if (!tokens) return <Navigate to="/login" replace />;

  const ready = isProfileReady(user);
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' })
    : '—';

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'نمای کلی' },
    { id: 'orders', label: 'سفارش‌ها' },
    { id: 'wishlist', label: 'علاقه‌مندی‌ها' },
    { id: 'profile', label: 'پروفایل' },
    { id: 'security', label: 'امنیت' },
    { id: 'track', label: 'پیگیری با کد' },
  ];

  return (
    <div className="container account-page">
      <div className="account-head">
        <div>
          <div className="section-eyebrow">حساب کاربری آنیل</div>
          <h1 className="section-title tight">{user?.full_name || 'حساب من'}</h1>
          <p className="content-excerpt">
            {user?.phone}
            {user?.email ? ` · ${user.email}` : ''}
          </p>
          {!ready && <p className="profile-gate-banner">{profileGapMessage(user)}</p>}
          {ready && <p className="profile-ready-banner">هویت تأیید شد — می‌توانید به گلد باکس اضافه کنید.</p>}
        </div>
        <div className="account-head-actions">
          <Link to="/products" className="outline-btn">
            ادامه خرید
          </Link>
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
      </div>

      <div className="account-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} onClick={() => switchTab(t.id)}>
            {t.label}
            {t.id === 'wishlist' && wishlist.length > 0 ? ` (${faNum(wishlist.length)})` : ''}
            {t.id === 'orders' && stats.pending > 0 ? ` · ${faNum(stats.pending)}` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="account-panel">
          <div className="account-overview-grid">
            <div className="account-stat-card accent">
              <span className="account-stat-label">تکمیل پروفایل</span>
              <strong className="account-stat-value">{faNum(completeness)}٪</strong>
              <div className="account-progress" aria-hidden>
                <i style={{ width: `${completeness}%` }} />
              </div>
              {!ready ? (
                <button type="button" className="text-link" onClick={() => switchTab('profile')}>
                  تکمیل اطلاعات
                </button>
              ) : (
                <span className="account-stat-hint">آماده خرید</span>
              )}
            </div>
            <div className="account-stat-card">
              <span className="account-stat-label">سفارش‌ها</span>
              <strong className="account-stat-value">{faNum(stats.orders)}</strong>
              <span className="account-stat-hint">
                {stats.pending ? `${faNum(stats.pending)} در انتظار پرداخت` : 'بدون سفارش باز'}
              </span>
            </div>
            <div className="account-stat-card">
              <span className="account-stat-label">علاقه‌مندی‌ها</span>
              <strong className="account-stat-value">{faNum(stats.wishlist)}</strong>
              <button type="button" className="text-link" onClick={() => switchTab('wishlist')}>
                مشاهده لیست
              </button>
            </div>
            <div className="account-stat-card">
              <span className="account-stat-label">جمع خریدها</span>
              <strong className="account-stat-value money">{faPrice(stats.spend)}</strong>
              <span className="account-stat-hint">تومان · سفارش‌های پرداخت‌شده</span>
            </div>
          </div>

          <div className="account-overview-split">
            <div>
              <h3 className="account-subhead">وضعیت هویت</h3>
              <ul className="account-check-list">
                {(
                  [
                    ['phone_verified', user?.phone_verified, 'تأیید موبایل'],
                    ['email_verified', user?.email_verified, 'تأیید ایمیل'],
                    ['full_name', !!user?.full_name?.trim(), 'نام و نام خانوادگی'],
                    ['national_code', !!user?.national_code?.trim(), 'کد ملی'],
                    ['address', !!user?.address?.trim() && !!user?.city?.trim(), 'آدرس ارسال'],
                  ] as const
                ).map(([key, ok, label]) => (
                  <li key={key} className={ok ? 'ok' : ''}>
                    <span>{ok ? '✓' : '○'}</span>
                    {label}
                  </li>
                ))}
              </ul>
              {gaps.length > 0 && (
                <p className="account-stat-hint" style={{ marginTop: 10 }}>
                  باقی‌مانده: {gaps.map((g) => PROFILE_FIELD_LABELS[g] || g).join('، ')}
                </p>
              )}
            </div>
            <div>
              <h3 className="account-subhead">آدرس ارسال پیش‌فرض</h3>
              {user?.address ? (
                <div className="account-address-card">
                  <strong>{user.full_name}</strong>
                  <p>
                    {user.city} — {user.address}
                  </p>
                  <p dir="ltr">کد پستی: {user.postal_code || '—'}</p>
                  <button type="button" className="text-link" onClick={() => switchTab('profile')}>
                    ویرایش آدرس
                  </button>
                </div>
              ) : (
                <div className="account-empty compact">
                  <p>آدرس ارسال هنوز ثبت نشده.</p>
                  <button type="button" className="gold-btn" onClick={() => switchTab('profile')}>
                    افزودن آدرس
                  </button>
                </div>
              )}
              <p className="account-stat-hint" style={{ marginTop: 14 }}>
                عضویت از {memberSince}
              </p>
            </div>
          </div>

          {orders[0] && (
            <div style={{ marginTop: 22 }}>
              <div className="account-subhead-row">
                <h3 className="account-subhead">آخرین سفارش</h3>
                <button type="button" className="text-link" onClick={() => switchTab('orders')}>
                  همه سفارش‌ها
                </button>
              </div>
              <OrderCard order={orders[0]} onPay={() => payAgain.mutate(orders[0])} />
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="account-panel">
          <div className="account-filter-chips" role="listbox" aria-label="فیلتر وضعیت">
            {[
              ['all', 'همه'],
              ['pending', 'در انتظار'],
              ['paid', 'پرداخت‌شده'],
              ['processing', 'پردازش'],
              ['shipped', 'ارسال'],
              ['delivered', 'تحویل'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={orderFilter === id ? 'active' : ''}
                onClick={() => setOrderFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {ordersLoading ? (
            <p className="account-stat-hint">در حال بارگذاری سفارش‌ها…</p>
          ) : filteredOrders.length === 0 ? (
            <div className="account-empty">
              <p>{orderFilter === 'all' ? 'هنوز سفارشی ندارید.' : 'سفارشی با این وضعیت نیست.'}</p>
              <Link to="/products" className="gold-btn">
                مشاهده محصولات
              </Link>
            </div>
          ) : (
            <div className="order-list">
              {filteredOrders.map((o) => (
                <OrderCard key={o.id} order={o} onPay={() => payAgain.mutate(o)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'wishlist' && (
        <div className="account-panel">
          {wishLoading ? (
            <p className="account-stat-hint">در حال بارگذاری…</p>
          ) : wishlist.length === 0 ? (
            <div className="account-empty">
              <p>لیست علاقه‌مندی خالی است.</p>
              <p className="account-stat-hint">از کارت محصولات، قلب را بزنید تا اینجا ذخیره شود.</p>
              <Link to="/products" className="gold-btn">
                گشت در گالری
              </Link>
            </div>
          ) : (
            <div className="account-wish-grid">
              {wishlist.map((w) => {
                const p = w.product;
                if (!p) return null;
                return (
                  <article key={w.id} className="account-wish-card">
                    <Link to={`/products/${p.slug}`} className="account-wish-media">
                      {p.primary_image ? (
                        <img src={p.primary_image} alt={p.name} loading="lazy" />
                      ) : (
                        <span>{p.category_name || 'طلا'}</span>
                      )}
                    </Link>
                    <div className="account-wish-body">
                      <Link to={`/products/${p.slug}`} className="account-wish-name">
                        {p.name}
                      </Link>
                      <div className="account-stat-hint">{p.category_name}</div>
                      <div className="account-wish-actions">
                        <button
                          type="button"
                          className="gold-btn"
                          disabled={!ordersEnabled}
                          onClick={() => {
                            if (!ordersEnabled) {
                              toast(salesClosedMessage);
                              return;
                            }
                            if (!isProfileReady(user)) {
                              toast(profileGapMessage(user));
                              switchTab('profile');
                              return;
                            }
                            if (p.has_weight === false || p.weight_g == null || Number(p.weight_g) <= 0) {
                              toast('وزن این قطعه هنوز تأیید نشده.');
                              return;
                            }
                            addToCart(p.id);
                            toast(`«${p.name}» به گلد باکس افزوده شد`);
                          }}
                        >
                          {ordersEnabled ? 'گلد باکس' : 'فروش بسته'}
                        </button>
                        <button
                          type="button"
                          className="outline-btn"
                          disabled={removeWish.isPending}
                          onClick={() => removeWish.mutate(w.id)}
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'track' && (
        <div className="account-panel">
          <p className="content-excerpt">با شماره سفارش و موبایل ثبت‌شده، وضعیت را ببینید (برای سفارش مهمان هم کار می‌کند).</p>
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
            <div style={{ marginTop: 20 }}>
              <OrderCard order={tracked} onPay={() => payAgain.mutate(tracked)} />
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

          <h3 className="account-subhead">تأیید هویت</h3>
          <div className="verify-grid">
            <div className={`verify-card${user?.phone_verified ? ' ok' : ''}`}>
              <div className="verify-card-head">
                <strong>تأیید موبایل (ایران)</strong>
                <span>{user?.phone_verified ? 'تأیید شد' : 'در انتظار'}</span>
              </div>
              <div dir="ltr" className="verify-target">
                {user?.phone}
              </div>
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
                    <button
                      type="button"
                      className="gold-btn"
                      disabled={confirmPhone.isPending || !phoneCode}
                      onClick={() => confirmPhone.mutate()}
                    >
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
              <div dir="ltr" className="verify-target">
                {user?.email || '—'}
              </div>
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
                    <button
                      type="button"
                      className="gold-btn"
                      disabled={confirmEmail.isPending || !emailCode}
                      onClick={() => confirmEmail.mutate()}
                    >
                      تأیید
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <h3 className="account-subhead" style={{ marginTop: 28 }}>
            اطلاعات شخصی و آدرس ارسال
          </h3>
          <div className="form-grid" style={{ maxWidth: 640 }}>
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
              <input
                className="input"
                dir="ltr"
                value={profile.national_code}
                onChange={(e) => setProfile({ ...profile, national_code: e.target.value })}
              />
            </label>
            <label>
              <span>شهر</span>
              <input className="input" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
            </label>
            <label>
              <span>کد پستی</span>
              <input
                className="input"
                dir="ltr"
                value={profile.postal_code}
                onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
              />
            </label>
            <label className="full">
              <span>آدرس کامل ارسال</span>
              <textarea className="input" rows={3} value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </label>
          </div>
          <button type="button" className="gold-btn" style={{ marginTop: 14 }} disabled={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
            ذخیره پروفایل
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div className="account-panel">
          <h3 className="account-subhead">تغییر رمز عبور</h3>
          <p className="content-excerpt">رمز فعلی را وارد کنید و رمز جدید امن انتخاب کنید.</p>
          <div className="form-grid" style={{ maxWidth: 420 }}>
            <label className="full">
              <span>رمز فعلی</span>
              <input
                className="input"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={pw.old_password}
                onChange={(e) => setPw({ ...pw, old_password: e.target.value })}
              />
            </label>
            <label className="full">
              <span>رمز جدید</span>
              <input
                className="input"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={pw.new_password}
                onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
              />
            </label>
            <label className="full">
              <span>تکرار رمز جدید</span>
              <input
                className="input"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              />
            </label>
          </div>
          <button
            type="button"
            className="gold-btn"
            style={{ marginTop: 14 }}
            disabled={
              changePassword.isPending || !pw.old_password || !pw.new_password || pw.new_password !== pw.confirm
            }
            onClick={() => {
              if (pw.new_password !== pw.confirm) {
                toast('تکرار رمز با رمز جدید یکسان نیست');
                return;
              }
              changePassword.mutate();
            }}
          >
            ذخیره رمز جدید
          </button>

          <div className="account-security-note">
            <h3 className="account-subhead">نکات امنیتی</h3>
            <ul className="account-check-list">
              <li className={user?.phone_verified ? 'ok' : ''}>
                <span>{user?.phone_verified ? '✓' : '○'}</span>
                موبایل تأییدشده
              </li>
              <li className={user?.email_verified ? 'ok' : ''}>
                <span>{user?.email_verified ? '✓' : '○'}</span>
                ایمیل تأییدشده
              </li>
            </ul>
            <button type="button" className="text-link" style={{ marginTop: 10 }} onClick={() => switchTab('profile')}>
              رفتن به تأیید هویت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onPay }: { order: Order; onPay: () => void }) {
  const steps = orderSteps(order.status);
  return (
    <article className="order-card">
      <div className="order-card-top">
        <div>
          <div className="order-no">{order.order_number}</div>
          <div className="order-date">{new Date(order.created_at).toLocaleString('fa-IR')}</div>
        </div>
        <span className={`status-badge status-${order.status}`}>{STATUS_FA[order.status] || order.status}</span>
      </div>
      <ul className="order-items">
        {order.items?.map((it) => (
          <li key={it.id}>
            {it.product_name} × {faNum(it.qty)} — {faPrice(it.line_total)}
          </li>
        ))}
      </ul>
      <div className="order-timeline" aria-label="مسیر سفارش">
        {steps.map((s) => (
          <div key={s.key} className={`ot-step${s.on ? ' on' : ''}${s.now ? ' now' : ''}`}>
            <span />
            {STATUS_FA[s.key]}
          </div>
        ))}
      </div>
      <div className="order-card-foot">
        <div>
          <div className="order-total">{faPrice(order.total)} تومان</div>
          {order.tracking_code && <div className="order-track-code">کد پیگیری پست: {order.tracking_code}</div>}
          {order.payment_ref_id && <div className="order-track-code">رسید پرداخت: {order.payment_ref_id}</div>}
          {order.city && (
            <div className="order-track-code">
              ارسال به {order.city}
              {order.address ? ` — ${order.address}` : ''}
            </div>
          )}
        </div>
        {order.status === 'pending' && (
          <button type="button" className="gold-btn" onClick={onPay}>
            پرداخت آزمایشی
          </button>
        )}
      </div>
    </article>
  );
}
