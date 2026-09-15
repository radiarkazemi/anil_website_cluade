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
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);
  const toast = useToast((s) => s.show);
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const weight = Number(product.estimated_weight_g || product.estimated_breakdown?.weight_g || 0);
  const deposit = product.deposit_amount ?? null;
  const depositGold =
    product.deposit_gold_g != null
      ? Number(product.deposit_gold_g) * qty
      : deposit != null && gp > 0
        ? (deposit * qty) / gp
        : null;
  const remainingGold =
    weight > 0 && depositGold != null ? Math.max(weight * qty - depositGold, 0) : null;

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
        note: 'رزرو محصول — بیعانه به‌صورت طلایی برای مشتری منظور می‌شود',
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
          این مدل هم‌اکنون در ویترین موجود نیست. با پرداخت بیعانه، سفارش ساخت ثبت می‌شود و مبلغ به‌صورت طلایی برای شما منظور می‌گردد.
        </p>

        <div className="reserve-modal-rows">
          <div className="reserve-modal-row">
            <span>وزن تقریبی قطعه</span>
            <strong>{weight > 0 ? `≈ ${faNum(weight * qty)} گرم` : 'بر اساس مدل‌های مشابه'}</strong>
          </div>
          <div className="reserve-modal-row">
            <span>مبلغ بیعانه (٪۲۰)</span>
            <strong>{deposit != null ? `${faPrice(deposit * qty)} تومان` : '—'}</strong>
          </div>
          <div className="reserve-modal-row highlight">
            <span>معادل طلایی بیعانه</span>
            <strong>
              {depositGold != null ? `≈ ${faNum(Number(depositGold.toFixed(3)))} گرم ۱۸ عیار` : '—'}
            </strong>
          </div>
          {remainingGold != null && remainingGold > 0 && (
            <div className="reserve-modal-row">
              <span>باقیمانده تقریبی</span>
              <strong>≈ {faNum(Number(remainingGold.toFixed(3)))} گرم</strong>
            </div>
          )}
        </div>

        <div className="reserve-rules">
          <div className="reserve-rules-title">قوانین رزرو</div>
          <ul>
            <li>مبلغ بیعانه به‌صورت طلایی از شما دریافت شده و برای شما اعمال می‌شود.</li>
            <li>
              مبلغ بیعانه با نرخ روز طلا به گرم ۱۸ عیار تبدیل می‌شود
              {gp > 0 ? ` (نرخ فعلی: ${faPrice(gp)} تومان)` : ''}
              و به‌عنوان طلب طلایی شما در حساب ثبت می‌گردد.
            </li>
            <li>
              باقیمانده وزن قطعه هنگام تحویل، با نرخ لحظه‌ای طلا محاسبه و تسویه می‌شود.
            </li>
            <li>
              جزئیات سفارش، گرم طلای بستانکار شما، و وضعیت رزرو در پروفایل قابل مشاهده است.
            </li>
          </ul>
        </div>

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
