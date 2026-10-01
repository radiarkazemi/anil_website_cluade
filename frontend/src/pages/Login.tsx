import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { isProfileReady, profileCompletePath } from '../utils/profileGate';

/** Storefront customer login — rejects admin/staff accounts on the API. */
export function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setTokens = useStore((s) => s.setTokens);
  const setUser = useStore((s) => s.setUser);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.login(phone, password);
      setTokens({ access: data.access, refresh: data.refresh });
      let user = data.user;
      if (!user) {
        const profile = await api.profile('client');
        user = profile.data;
      }
      setUser(user);
      toast(`خوش آمدید، ${user.full_name || user.phone}`);
      nav(isProfileReady(user) ? '/' : profileCompletePath());
    } catch (err: any) {
      const d = err.response?.data;
      setError(
        d?.detail
        || (Array.isArray(d?.non_field_errors) && d.non_field_errors[0])
        || 'ورود ناموفق بود.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell handoff-auth">
      <form onSubmit={handleLogin} className="auth-card handoff-auth-card">
        <h1 className="auth-title">ورود به حساب</h1>
        <p className="auth-sub">برای ادامه، شماره همراه و رمز عبور خود را وارد کنید.</p>
        <label className="handoff-auth-label">
          <span>شماره همراه</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            className="input"
            dir="ltr"
            autoComplete="username"
            inputMode="tel"
          />
        </label>
        <label className="handoff-auth-label">
          <span>رمز عبور</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="رمز عبور"
            className="input"
            type="password"
            autoComplete="current-password"
          />
        </label>
        {error && <div className="handoff-auth-error">{error}</div>}
        <button type="submit" className="gold-btn handoff-auth-cta" disabled={busy}>
          {busy ? 'در حال ورود…' : 'ورود به حساب'}
          <span aria-hidden>‹</span>
        </button>
        <p className="handoff-auth-terms">
          با ورود یا ثبت‌نام در آنیل،{' '}
          <Link to="/p/حریم-خصوصی">قوانین و حریم خصوصی</Link> را می‌پذیرید.
        </p>
        <div className="handoff-auth-switch">
          حساب ندارید؟{' '}
          <Link to="/register">ثبت‌نام</Link>
        </div>
      </form>
    </div>
  );
}
