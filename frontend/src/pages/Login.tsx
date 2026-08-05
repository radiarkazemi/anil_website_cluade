import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';

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
    setBusy(true); setError('');
    try {
      const { data } = await api.login(phone, password);
      setTokens(data);
      const { data: user } = await api.profile();
      setUser(user);
      toast(`خوش آمدید، ${user.full_name || user.phone}`);
      nav('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'ورود ناموفق بود.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <form onSubmit={handleLogin} style={{
        width: 420, maxWidth: '100%', background: 'var(--surface)', border: '1px solid var(--border-gold)',
        borderRadius: 20, padding: '36px 30px',
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>ورود</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 28 }}>با شماره تلفن وارد شوید.</p>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="شماره تلفن" className="input" dir="ltr" style={{ marginBottom: 14 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور" className="input" type="password" style={{ marginBottom: 14 }} />
        {error && <div style={{ color: 'var(--down)', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <button type="submit" className="gold-btn" disabled={busy} style={{ width: '100%', marginBottom: 16 }}>{busy ? 'در حال ورود…' : 'ورود'}</button>
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-dim)' }}>حساب ندارید؟ <Link to="/register" style={{ color: 'var(--gold-light)', fontWeight: 600 }}>ثبت‌نام</Link></div>
      </form>
    </div>
  );
}
