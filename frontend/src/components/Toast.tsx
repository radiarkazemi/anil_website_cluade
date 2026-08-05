import { useToast } from '../store/toastStore';

export function Toast() {
  const message = useToast((s) => s.message);
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
      background: '#141009', border: '1px solid rgba(212,175,55,.4)', color: 'var(--text)',
      padding: '13px 22px', borderRadius: 12, fontSize: 14, fontWeight: 600,
      boxShadow: '0 16px 40px rgba(0,0,0,.5)', animation: 'toast-in .3s ease',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ color: 'var(--gold-light)' }}>✓</span> {message}
    </div>
  );
}
