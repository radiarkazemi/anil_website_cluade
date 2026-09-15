import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../types';
import { api } from '../api/endpoints';
import { useStore } from '../store/useStore';
import { useToast } from '../store/toastStore';
import { faNum, faPrice } from '../utils/format';
import { isProfileReady, profileCompletePath, profileGapMessage } from '../utils/profileGate';

type Props = {
  product: Product;
  qty?: number;
  open: boolean;
  onClose: () => void;
};

export function ReserveModal({ product, qty = 1, open, onClose }: Props) {
  const user = useStore((s) => s.user);
  const tokens = useStore((s) => s.tokens);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const weight = Number(product.estimated_weight_g || product.estimated_breakdown?.weight_g || 0);
  const deposit = product.deposit_amount ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const ensureAuth = () => {
    if (!tokens || !user) {
      toast('برای رزرو ابتدا وارد شوید یا ثبت‌نام کنید.');
      onClose();
      nav('/register');
      return false;
    }
    if (!isProfileReady(user)) {
      toast(profileGapMessage(user));
      onClose();
      nav(profileCompletePath());
      return false;
    }
    return true;
  };

  const confirmReserve = async () => {
    if (busy) return;
    if (!ensureAuth()) return;
    setBusy(true);
    try {
      const { data: order } = await api.createOrderFromProfile({
        items: [{ product_id: product.id, qty }],
        order_kind: 'deposit',
        note: 'رزرو محصول — تهیه بر اساس وزن تقریبی مدل‌های مشابه',
      });
      toast(`رزرو ${order.order_number} ثبت شد`);
      onClose();
      nav(`/payment/demo/${order.order_number}`);
    } catch (e: any) {
      const data = e?.response?.data;
      const detail = typeof data?.detail === 'string'
        ? data.detail
        : typeof data?.items === 'string'
          ? data.items
          : Array.isArray(data?.items)
            ? data.items.join('، ')
            : 'ثبت رزرو ناموفق بود.';
      toast(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="reserve-overlay" role="presentation" onClick={onClose}>
      <div
        className="reserve-modal"
        role="dialog"
        aria-modal="true"
        aria-label="رزرو محصول"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="reserve-modal-head">
          <div>
            <div className="reserve-modal-eyebrow">قابل سفارش</div>
            <h3>{product.name}</h3>
          </div>
          <button type="button" className="reserve-modal-close" onClick={onClose} aria-label="بستن">
            ✕
          </button>
        </header>

        <p className="reserve-modal-copy">
          این مدل هم‌اکنون در ویترین موجود نیست. با پرداخت مبلغ رزرو، قطعه بر اساس وزن تقریبی مدل‌های مشابه برای شما تهیه می‌شود.
        </p>

        <div className="reserve-modal-rows">
          <div className="reserve-modal-row">
            <span>وزن تقریبی</span>
            <strong>{weight > 0 ? `≈ ${faNum(weight)} گرم` : 'بر اساس مدل‌های مشابه'}</strong>
          </div>
          <div className="reserve-modal-row highlight">
            <span>مبلغ رزرو (٪۲۰)</span>
            <strong>{deposit != null ? `${faPrice(deposit)} تومان` : '—'}</strong>
          </div>
        </div>

        <p className="reserve-modal-note">
          مابه‌تفاوت هنگام تحویل بر اساس وزن واقعی محاسبه می‌شود.
        </p>

        <div className="reserve-modal-actions">
          <button type="button" className="gold-btn" disabled={busy || deposit == null} onClick={confirmReserve}>
            {busy ? 'در حال ثبت…' : 'تأیید و پرداخت رزرو'}
          </button>
          <button type="button" className="outline-btn" onClick={onClose}>
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}
