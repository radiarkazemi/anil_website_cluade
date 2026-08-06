import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';

export function Register() {
  const [form, setForm] = useState({ phone: '', full_name: '', email: '', password: '', password_confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setTokens = useStore((s) => s.setTokens);
  const setUser = useStore((s) => s.setUser);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.register(form);
      setTokens(data.tokens);
      setUser(data.user);
      toast(`خوش آمدید، ${data.user.full_name || data.user.phone}`);
      nav('/');
    } catch (err: any) {
      const d = err.response?.data;
      const msg = d?.phone?.[0] || d?.password?.[0] || d?.password_confirm?.[0] || d?.detail || 'ثبت‌نام ناموفق بود.';
      setError(String(msg));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-shell">
      <form onSubmit={handleRegister} className="auth-card">
        <h1 className="auth-title">ثبت‌نام</h1>
        <p className="auth-sub">حساب جدید بسازید.</p>
        <input value={form.full_name} onChange={upd('full_name')} placeholder="نام و نام خانوادگی" className="input" style={{ marginBottom: 14 }} />
        <input value={form.phone} onChange={upd('phone')} placeholder="شماره تلفن" className="input" dir="ltr" style={{ marginBottom: 14 }} />
        <input value={form.email} onChange={upd('email')} placeholder="ایمیل (اختیاری)" className="input" dir="ltr" style={{ marginBottom: 14 }} />
        <input value={form.password} onChange={upd('password')} placeholder="رمز عبور" type="password" className="input" style={{ marginBottom: 14 }} />
        <input value={form.password_confirm} onChange={upd('password_confirm')} placeholder="تکرار رمز عبور" type="password" className="input" style={{ marginBottom: 14 }} />
        {error && <div style={{ color: 'var(--down)', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <button type="submit" className="gold-btn" disabled={busy} style={{ width: '100%', marginBottom: 16 }}>{busy ? 'در حال ثبت…' : 'ثبت‌نام'}</button>
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-dim)' }}>حساب دارید؟ <Link to="/login" style={{ color: 'var(--gold-light)', fontWeight: 600 }}>ورود</Link></div>
      </form>
    </div>
  );
}
