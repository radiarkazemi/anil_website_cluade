import { useState } from 'react';
import { useToast } from '../../store/toastStore';
import { PageHeader } from './adminShared';

const DEFAULTS = {
  store_name: 'گالری طلا آنیل',
  phone: '021-12345678',
  email: 'info@anilgold.ir',
  address: 'تهران، بازار بزرگ طلا',
  shipping_note: 'ارسال بیمه‌شده به سراسر کشور ظرف ۲ تا ۴ روز کاری',
  low_stock_threshold: 2,
  tax_note: 'مالیات ۹٪ فقط روی اجرت ساخت اعمال می‌شود',
};

export function AdminSettings() {
  const toast = useToast((s) => s.show);
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem('anil-admin-settings');
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  const save = () => {
    localStorage.setItem('anil-admin-settings', JSON.stringify(form));
    toast('تنظیمات پنل ذخیره شد');
  };

  return (
    <div>
      <PageHeader
        title="تنظیمات عملیات"
        subtitle="پیکربندی نمایشی فروشگاه و آستانه‌های عملیاتی پنل"
        actions={<button type="button" className="gold-btn" onClick={save}>ذخیره تنظیمات</button>}
      />

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>هویت فروشگاه</h3>
          <div className="form-grid">
            <label>
              <span>نام فروشگاه</span>
              <input className="input" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
            </label>
            <label>
              <span>تلفن</span>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              <span>ایمیل</span>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="full">
              <span>آدرس</span>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>عملیات و هشدار</h3>
          <div className="form-grid">
            <label>
              <span>آستانه موجودی کم</span>
              <input
                className="input"
                type="number"
                value={form.low_stock_threshold}
                onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })}
              />
            </label>
            <label className="full">
              <span>متن ارسال</span>
              <textarea className="input" value={form.shipping_note} onChange={(e) => setForm({ ...form, shipping_note: e.target.value })} />
            </label>
            <label className="full">
              <span>یادداشت مالیات</span>
              <textarea className="input" value={form.tax_note} onChange={(e) => setForm({ ...form, tax_note: e.target.value })} />
            </label>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>میانبرهای حرفه‌ای</h3>
        <ul className="settings-tips">
          <li><kbd>Ctrl</kbd> + <kbd>K</kbd> — پالت فرمان برای پرش سریع بین صفحات</li>
          <li>داشبورد هر ۴۵ ثانیه به‌صورت خودکار همگام می‌شود</li>
          <li>در سفارش‌ها روی هر ردیف کلیک کنید تا کشوی جزئیات باز شود</li>
          <li>نقش کاربران را از صفحه کاربران به staff/admin ارتقا دهید</li>
        </ul>
      </div>
    </div>
  );
}
