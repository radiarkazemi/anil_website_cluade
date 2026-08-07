import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { profileCompletePath } from '../utils/profileGate';

const empty = {
  full_name: '',
  phone: '',
  email: '',
  national_code: '',
  city: '',
  postal_code: '',
  address: '',
  password: '',
  password_confirm: '',
};

export function Register() {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setTokens = useStore((s) => s.setTokens);
  const setUser = useStore((s) => s.setUser);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();

  const upd = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.register(form);
      setTokens(data.tokens);
      setUser(data.user);
      toast(data.detail || `خوش آمدید، ${data.user.full_name || data.user.phone}`);
      nav(data.next || profileCompletePath());
    } catch (err: any) {
      const d = err.response?.data;
      if (d && typeof d === 'object') {
        const first = Object.entries(d)
          .map(([k, v]) => {
            const msg = Array.isArray(v) ? v[0] : v;
            return typeof msg === 'string' ? msg : `${k}: ${JSON.stringify(msg)}`;
          })
          .find(Boolean);
        setError(String(first || d.detail || 'ثبت‌نام ناموفق بود.'));
      } else {
        setError('ثبت‌نام ناموفق بود.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <form onSubmit={handleRegister} className="auth-card auth-card-wide">
        <h1 className="auth-title">ثبت‌نام</h1>
        <p className="auth-sub">اطلاعات هویتی برای خرید طلا الزامی است. پس از ثبت‌نام، موبایل و ایمیل را تأیید کنید.</p>

        <div className="auth-grid">
          <input required value={form.full_name} onChange={upd('full_name')} placeholder="نام و نام خانوادگی *" className="input" />
          <input required value={form.phone} onChange={upd('phone')} placeholder="موبایل ایران * (09…)" className="input" dir="ltr" />
          <input required value={form.email} onChange={upd('email')} placeholder="ایمیل *" className="input" dir="ltr" type="email" />
          <input required value={form.national_code} onChange={upd('national_code')} placeholder="کد ملی *" className="input" dir="ltr" />
          <input required value={form.city} onChange={upd('city')} placeholder="شهر *" className="input" />
          <input required value={form.postal_code} onChange={upd('postal_code')} placeholder="کد پستی ۱۰ رقمی *" className="input" dir="ltr" />
          <textarea required value={form.address} onChange={upd('address')} placeholder="آدرس کامل ارسال *" className="input auth-span-2" rows={2} />
          <input required value={form.password} onChange={upd('password')} placeholder="رمز عبور *" type="password" className="input" />
          <input required value={form.password_confirm} onChange={upd('password_confirm')} placeholder="تکرار رمز عبور *" type="password" className="input" />
        </div>

        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="gold-btn" disabled={busy} style={{ width: '100%', marginBottom: 16 }}>
          {busy ? 'در حال ثبت…' : 'ثبت‌نام و ورود خودکار'}
        </button>
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-dim)' }}>
          حساب دارید؟ <Link to="/login" style={{ color: 'var(--gold-light)', fontWeight: 600 }}>ورود</Link>
        </div>
      </form>
    </div>
  );
}
