import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { useToast } from '../../store/toastStore';
import { PageHeader } from './adminShared';

export function AdminSettings() {
  const toast = useToast((s) => s.show);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: () => api.adminSiteSettings().then((r) => r.data),
  });

  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [shippingNote, setShippingNote] = useState('');
  const [taxNote, setTaxNote] = useState('');
  const [lowStock, setLowStock] = useState(2);

  useEffect(() => {
    if (!data) return;
    setStoreName(data.brand_name || '');
    setPhone(data.contact_phone || '');
    setEmail(data.contact_email || '');
    setAddress(data.contact_address || '');
    setShippingNote(data.cms?.ops?.shipping_note || '');
    setTaxNote(data.cms?.ops?.tax_note || '');
    setLowStock(Number(data.cms?.ops?.low_stock_threshold ?? 2));
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.adminUpdateSiteSettings({
        brand_name: storeName,
        contact_phone: phone,
        contact_email: email,
        contact_address: address,
        cms: {
          ops: {
            shipping_note: shippingNote,
            tax_note: taxNote,
            low_stock_threshold: lowStock,
          },
        },
      }),
    onSuccess: () => {
      toast('تنظیمات ذخیره شد');
      qc.invalidateQueries({ queryKey: ['admin-site-settings'] });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    },
    onError: () => toast('خطا در ذخیره تنظیمات'),
  });

  if (isLoading) {
    return <div className="admin-card">در حال بارگذاری تنظیمات…</div>;
  }

  return (
    <div>
      <PageHeader
        title="تنظیمات عملیات"
        subtitle="هویت فروشگاه و آستانه‌های عملیاتی — همه جزئیات ظاهری در چیدمان سایت"
        actions={(
          <button
            type="button"
            className="gold-btn"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? '…' : 'ذخیره تنظیمات'}
          </button>
        )}
      />

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>هویت فروشگاه</h3>
          <div className="form-grid">
            <label>
              <span>نام فروشگاه</span>
              <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
            </label>
            <label>
              <span>تلفن</span>
              <input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              <span>ایمیل</span>
              <input className="input" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="full">
              <span>آدرس</span>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
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
                value={lowStock}
                onChange={(e) => setLowStock(Number(e.target.value))}
              />
            </label>
            <label className="full">
              <span>متن ارسال</span>
              <textarea className="input" value={shippingNote} onChange={(e) => setShippingNote(e.target.value)} />
            </label>
            <label className="full">
              <span>یادداشت مالیات</span>
              <textarea className="input" value={taxNote} onChange={(e) => setTaxNote(e.target.value)} />
            </label>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>ویرایش کامل ظاهر سایت</h3>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 12 }}>
          هیرو، نقشه واقعی گوگل، فوتر، بنرها، بلاگ، محصولات و هر متن/تصویر فروشگاه را از{' '}
          <Link to="/panel/layout" style={{ color: 'var(--gold-light)', fontWeight: 700 }}>چیدمان سایت</Link>
          {' '}ویرایش کنید.
        </p>
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
