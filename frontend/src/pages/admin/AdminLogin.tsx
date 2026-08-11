import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { useStore } from '../../store/useStore';
import { useToast } from '../../store/toastStore';

/** Dedicated ops-panel login — staff/admin only. */
export function AdminLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const adminTokens = useStore((s) => s.adminTokens);
  const setAdminTokens = useStore((s) => s.setAdminTokens);
  const setAdminUser = useStore((s) => s.setAdminUser);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();

  const alreadyIn = !!adminTokens;
  if (alreadyIn) return <Navigate to="/panel" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.adminLogin(phone, password);
      setAdminTokens({ access: data.access, refresh: data.refresh });
      const { data: user } = await api.profile('admin');
      setAdminUser(user);
      toast(`ورود به پنل — ${user.full_name || user.phone}`);
      nav('/panel', { replace: true });
    } catch (err: any) {
      const d = err.response?.data;
      setError(
        d?.detail
        || (Array.isArray(d?.non_field_errors) && d.non_field_errors[0])
        || 'ورود به پنل ناموفق بود.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleLogin}>
        <div className="admin-login-brand">
          <div className="logo-mark admin-logo-mark">
            <img src="/logo-mark.png" alt="Anil" />
          </div>
          <div>
            <div className="admin-brand-name">ANIL OPS</div>
            <div className="admin-brand-sub">ورود مدیریت</div>
          </div>
        </div>
        <h1>ورود به پنل مدیریت</h1>
        <p>فقط حساب‌های مدیر و کارمند می‌توانند وارد شوند.</p>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="نام کاربری مدیر"
          className="input"
          dir="ltr"
          autoComplete="username"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="رمز عبور"
          className="input"
          type="password"
          autoComplete="current-password"
        />
        {error && <div className="admin-login-error">{error}</div>}
        <button type="submit" className="gold-btn" disabled={busy}>
          {busy ? 'در حال ورود…' : 'ورود به پنل'}
        </button>
        <div className="admin-login-foot">
          <Link to="/">بازگشت به فروشگاه</Link>
          <span>·</span>
          <Link to="/login">ورود مشتریان</Link>
        </div>
      </form>
    </div>
  );
}
