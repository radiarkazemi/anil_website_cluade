import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../api/endpoints';
import { useToast } from '../../store/toastStore';
import { PageHeader } from './adminShared';
import type { SiteSettings } from '../../types';

const SECTION_LABELS: Record<string, string> = {
  hero: 'هیرو (تصویر متحرک)',
  rates: 'نرخ زنده طلا',
  categories: 'دسته‌بندی محصولات',
  featured: 'پرفروش‌ها',
  trust: 'اعتماد و قیمت‌گذاری',
};

const DEFAULT_ORDER = ['hero', 'rates', 'categories', 'featured', 'trust'];

export function AdminSiteLayout() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: () => api.adminSiteSettings().then((r) => r.data),
  });
  const [form, setForm] = useState<Partial<SiteSettings> | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        section_order: data.section_order?.length ? [...data.section_order] : [...DEFAULT_ORDER],
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const fd = new FormData();
      const keys: (keyof SiteSettings)[] = [
        'brand_name', 'brand_tagline', 'cart_label', 'top_banner',
        'hero_badge', 'hero_title', 'hero_subtitle',
        'hero_cta_primary', 'hero_cta_secondary',
      ];
      keys.forEach((k) => {
        const v = form[k];
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      fd.append('show_rates', String(!!form.show_rates));
      fd.append('show_categories', String(!!form.show_categories));
      fd.append('show_featured', String(!!form.show_featured));
      fd.append('show_trust', String(!!form.show_trust));
      fd.append('section_order', JSON.stringify(form.section_order || DEFAULT_ORDER));
      if (logoFile) fd.append('brand_logo', logoFile);
      if (heroFile) fd.append('hero_image', heroFile);
      return api.adminUpdateSiteSettings(fd);
    },
    onSuccess: () => {
      toast('چیدمان ذخیره شد');
      setLogoFile(null);
      setHeroFile(null);
      qc.invalidateQueries({ queryKey: ['admin-site-settings'] });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    },
    onError: () => toast('خطا در ذخیره چیدمان'),
  });

  const moveSection = (idx: number, dir: -1 | 1) => {
    if (!form?.section_order) return;
    const next = [...form.section_order];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setForm({ ...form, section_order: next });
  };

  if (isLoading || !form) {
    return <div className="admin-card">در حال بارگذاری چیدمان…</div>;
  }

  const set = (patch: Partial<SiteSettings>) => setForm({ ...form, ...patch });

  return (
    <div>
      <PageHeader
        title="چیدمان فروشگاه"
        subtitle="مثل Elementor — برند، هیرو، تصویر متحرک و ترتیب بخش‌های صفحه اصلی را از اینجا مدیریت کنید"
        actions={(
          <button type="button" className="gold-btn" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? '…' : 'ذخیره چیدمان'}
          </button>
        )}
      />

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>برند و منو</h3>
          <div className="form-grid">
            <label>
              <span>نام برند</span>
              <input className="input" value={form.brand_name || ''} onChange={(e) => set({ brand_name: e.target.value })} />
            </label>
            <label>
              <span>زیرعنوان</span>
              <input className="input" value={form.brand_tagline || ''} onChange={(e) => set({ brand_tagline: e.target.value })} />
            </label>
            <label>
              <span>برچسب سبد (گلد باکس)</span>
              <input className="input" value={form.cart_label || ''} onChange={(e) => set({ cart_label: e.target.value })} />
            </label>
            <label className="full">
              <span>بنر بالای سایت</span>
              <input className="input" value={form.top_banner || ''} onChange={(e) => set({ top_banner: e.target.value })} />
            </label>
            <label className="full">
              <span>لوگوی منو</span>
              {(form.brand_logo_url || logoFile) && (
                <img
                  className="layout-preview-logo"
                  src={logoFile ? URL.createObjectURL(logoFile) : form.brand_logo_url!}
                  alt="logo"
                />
              )}
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>هیرو و تصویر متحرک</h3>
          <div className="form-grid">
            <label>
              <span>بج</span>
              <input className="input" value={form.hero_badge || ''} onChange={(e) => set({ hero_badge: e.target.value })} />
            </label>
            <label>
              <span>دکمه اصلی</span>
              <input className="input" value={form.hero_cta_primary || ''} onChange={(e) => set({ hero_cta_primary: e.target.value })} />
            </label>
            <label className="full">
              <span>عنوان (هر خط جدا)</span>
              <textarea className="input" rows={3} value={form.hero_title || ''} onChange={(e) => set({ hero_title: e.target.value })} />
            </label>
            <label className="full">
              <span>توضیح کوتاه</span>
              <textarea className="input" rows={3} value={form.hero_subtitle || ''} onChange={(e) => set({ hero_subtitle: e.target.value })} />
            </label>
            <label>
              <span>دکمه فرعی</span>
              <input className="input" value={form.hero_cta_secondary || ''} onChange={(e) => set({ hero_cta_secondary: e.target.value })} />
            </label>
            <label className="full">
              <span>تصویر جواهر متحرک (جایگزین حلقه CSS)</span>
              {(form.hero_image_url || heroFile) && (
                <img
                  className="layout-preview-hero"
                  src={heroFile ? URL.createObjectURL(heroFile) : form.hero_image_url!}
                  alt="hero"
                />
              )}
              <input type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
      </div>

      <div className="admin-grid-2" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>نمایش بخش‌ها</h3>
          <div className="layout-toggles">
            {([
              ['show_rates', 'نرخ زنده'],
              ['show_categories', 'دسته‌بندی‌ها'],
              ['show_featured', 'پرفروش‌ها'],
              ['show_trust', 'اعتماد / قیمت‌گذاری'],
            ] as const).map(([key, label]) => (
              <label key={key} className="layout-toggle">
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => set({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>ترتیب بخش‌های صفحه اصلی</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 12 }}>
            بالا و پایین ببرید — مثل ویرایشگر چیدمان وردپرس.
          </p>
          <ul className="layout-order-list">
            {(form.section_order || DEFAULT_ORDER).map((key, idx) => (
              <li key={key}>
                <span>{SECTION_LABELS[key] || key}</span>
                <span className="layout-order-actions">
                  <button type="button" className="outline-btn" disabled={idx === 0} onClick={() => moveSection(idx, -1)}>↑</button>
                  <button
                    type="button"
                    className="outline-btn"
                    disabled={idx === (form.section_order?.length || 0) - 1}
                    onClick={() => moveSection(idx, 1)}
                  >
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
