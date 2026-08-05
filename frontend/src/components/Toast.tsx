import { useToast } from '../store/toastStore';

export function Toast() {
  const message = useToast((s) => s.message);
  if (!message) return null;
  return (
    <div className="site-toast" role="status" aria-live="polite">
      <span className="site-toast-icon" aria-hidden>✓</span>
      <span className="site-toast-msg">{message}</span>
    </div>
  );
}
