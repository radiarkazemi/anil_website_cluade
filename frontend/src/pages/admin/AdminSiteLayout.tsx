import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/endpoints';
import { useToast } from '../../store/toastStore';
import { PageHeader } from './adminShared';
import type { HeroAlbumSlide, SiteSettings } from '../../types';

const SECTION_LABELS: Record<string, string> = {
  hero: 'هیرو (تصویر / ۳بعدی)',
  rates: 'نرخ زنده طلا',
  categories: 'دسته‌بندی محصولات',
  featured: 'پرفروش‌ها',
  trust: 'اعتماد و قیمت‌گذاری',
};

const DEFAULT_ORDER = ['hero', 'rates', 'categories', 'featured', 'trust'];

type SaveSection = 'brand' | 'hero' | 'footer' | 'visibility' | 'order' | 'all';

function SectionSaveBar({
  label,
  pending,
  onSave,
}: {
  label?: string;
  pending: boolean;
  onSave: () => void;
}) {
  return (
    <div className="layout-section-save">
      <button type="button" className="gold-btn" disabled={pending} onClick={onSave}>
        {pending ? 'در حال ذخیره…' : (label || 'ذخیره این بخش')}
      </button>
    </div>
  );
}

export function AdminSiteLayout() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: () => api.adminSiteSettings().then((r) => r.data),
  });
  const [form, setForm] = useState<Partial<SiteSettings> | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingSection, setSavingSection] = useState<SaveSection | null>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        section_order: data.section_order?.length ? [...data.section_order] : [...DEFAULT_ORDER],
      });
    }
  }, [data]);

  const buildPayload = (section: SaveSection): FormData | Record<string, unknown> => {
    if (!form) return {};

    if (section === 'brand') {
      if (logoFile) {
        const fd = new FormData();
        fd.append('brand_name', form.brand_name || '');
        fd.append('brand_tagline', form.brand_tagline || '');
        fd.append('cart_label', form.cart_label || '');
        fd.append('top_banner', form.top_banner || '');
        fd.append('brand_logo', logoFile);
        return fd;
      }
      return {
        brand_name: form.brand_name || '',
        brand_tagline: form.brand_tagline || '',
        cart_label: form.cart_label || '',
        top_banner: form.top_banner || '',
      };
    }

    if (section === 'hero') {
      return {
        hero_badge: form.hero_badge || '',
        hero_title: form.hero_title || '',
        hero_subtitle: form.hero_subtitle || '',
        hero_mode: form.hero_mode || 'image',
        hero_cta_primary: form.hero_cta_primary || '',
        hero_cta_secondary: form.hero_cta_secondary || '',
        hero_cta_primary_url: form.hero_cta_primary_url || '/products',
        hero_cta_secondary_url: form.hero_cta_secondary_url || '#market',
      };
    }

    if (section === 'footer') {
      return {
        trust_heading: form.trust_heading || '',
        footer_tagline: form.footer_tagline || '',
        contact_phone: form.contact_phone || '',
        contact_email: form.contact_email || '',
        contact_address: form.contact_address || '',
      };
    }

    if (section === 'visibility') {
      return {
        show_rates: !!form.show_rates,
        show_categories: !!form.show_categories,
        show_featured: !!form.show_featured,
        show_trust: !!form.show_trust,
      };
    }

    if (section === 'order') {
      return {
        section_order: form.section_order || DEFAULT_ORDER,
      };
    }

    // all
    if (logoFile) {
      const fd = new FormData();
      const keys: (keyof SiteSettings)[] = [
        'brand_name', 'brand_tagline', 'cart_label', 'top_banner',
        'hero_badge', 'hero_title', 'hero_subtitle', 'hero_mode',
        'hero_cta_primary', 'hero_cta_secondary',
        'hero_cta_primary_url', 'hero_cta_secondary_url',
        'trust_heading', 'footer_tagline',
        'contact_phone', 'contact_email', 'contact_address',
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
      return fd;
    }

    return {
      brand_name: form.brand_name || '',
      brand_tagline: form.brand_tagline || '',
      cart_label: form.cart_label || '',
      top_banner: form.top_banner || '',
      hero_badge: form.hero_badge || '',
      hero_title: form.hero_title || '',
      hero_subtitle: form.hero_subtitle || '',
      hero_mode: form.hero_mode || 'image',
      hero_cta_primary: form.hero_cta_primary || '',
      hero_cta_secondary: form.hero_cta_secondary || '',
      hero_cta_primary_url: form.hero_cta_primary_url || '/products',
      hero_cta_secondary_url: form.hero_cta_secondary_url || '#market',
      trust_heading: form.trust_heading || '',
      footer_tagline: form.footer_tagline || '',
      contact_phone: form.contact_phone || '',
      contact_email: form.contact_email || '',
      contact_address: form.contact_address || '',
      show_rates: !!form.show_rates,
      show_categories: !!form.show_categories,
      show_featured: !!form.show_featured,
      show_trust: !!form.show_trust,
      section_order: form.section_order || DEFAULT_ORDER,
    };
  };

  const save = useMutation({
    mutationFn: async (section: SaveSection) => {
      setSavingSection(section);
      const payload = buildPayload(section);
      return api.adminUpdateSiteSettings(payload);
    },
    onSuccess: (_data, section) => {
      toast('ذخیره شد');
      if (section === 'brand' || section === 'all') setLogoFile(null);
      qc.invalidateQueries({ queryKey: ['admin-site-settings'] });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    },
    onError: (err: unknown) => {
      const anyErr = err as { response?: { data?: Record<string, unknown> | string } };
      const data = anyErr?.response?.data;
      let msg = 'خطا در ذخیره';
      if (typeof data === 'string') msg = data;
      else if (data && typeof data === 'object') {
        if (typeof data.detail === 'string') msg = data.detail;
        else {
          const first = Object.entries(data)[0];
          if (first) {
            const [k, v] = first;
            msg = `${k}: ${Array.isArray(v) ? v.join('، ') : String(v)}`;
          }
        }
      }
      toast(msg);
    },
    onSettled: () => setSavingSection(null),
  });

  const moveSection = (idx: number, dir: -1 | 1) => {
    if (!form?.section_order) return;
    const next = [...form.section_order];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setForm({ ...form, section_order: next });
  };

  const albumSlides = (form?.hero_album || []).filter((s) => s.id !== 'legacy') as HeroAlbumSlide[];

  const refreshAlbum = () => {
    qc.invalidateQueries({ queryKey: ['admin-site-settings'] });
    qc.invalidateQueries({ queryKey: ['site-settings'] });
  };

  const uploadSlides = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await api.adminUploadHeroSlide(file);
      }
    },
    onSuccess: () => {
      toast('عکس به آلبوم اضافه شد');
      refreshAlbum();
    },
    onError: (err: unknown) => {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      toast(anyErr?.response?.data?.detail || 'آپلود ناموفق');
    },
  });

  const deleteSlide = useMutation({
    mutationFn: (id: string) => api.adminDeleteHeroSlide(id),
    onSuccess: () => {
      toast('حذف شد');
      refreshAlbum();
    },
    onError: () => toast('حذف ناموفق'),
  });

  const patchSlide = useMutation({
    mutationFn: ({ id, ...data }: { id: string; caption?: string; is_active?: boolean }) =>
      api.adminUpdateHeroSlide(id, data),
    onSuccess: () => refreshAlbum(),
    onError: () => toast('ذخیره اسلاید ناموفق'),
  });

  const reorderAlbum = useMutation({
    mutationFn: (ids: string[]) => api.adminReorderHeroAlbum(ids),
    onSuccess: () => refreshAlbum(),
    onError: () => toast('ترتیب ذخیره نشد'),
  });

  const moveSlide = (id: string, dir: -1 | 1) => {
    const ids = albumSlides.map((s) => s.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    setForm((f) => {
      if (!f?.hero_album) return f;
      const map = Object.fromEntries(f.hero_album.map((s) => [s.id, s]));
      const reordered = next.map((nid, order) => ({ ...map[nid], sort_order: order })).filter(Boolean);
      const legacy = f.hero_album.filter((s) => s.id === 'legacy');
      return { ...f, hero_album: [...reordered, ...legacy] as HeroAlbumSlide[] };
    });
    reorderAlbum.mutate(next);
  };

  if (isLoading || !form) {
    return <div className="admin-card">در حال بارگذاری چیدمان…</div>;
  }

  const set = (patch: Partial<SiteSettings>) => setForm({ ...form, ...patch });
  const previewTitle = (form.hero_title || '').split('\n').filter(Boolean);
  const pending = save.isPending;

  return (
    <div>
      <PageHeader
        title="چیدمان فروشگاه"
        subtitle="هر بخش دکمه ذخیره جدا دارد — بعد از ویرایش همان بخش را ذخیره کنید"
        actions={(
          <button
            type="button"
            className="outline-btn"
            disabled={pending}
            onClick={() => save.mutate('all')}
          >
            {savingSection === 'all' ? '…' : 'ذخیره همه'}
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
          <SectionSaveBar pending={savingSection === 'brand'} onSave={() => save.mutate('brand')} />
        </div>

        <div className="admin-card layout-hero-preview-card">
          <h3 style={{ marginBottom: 10 }}>پیش‌نمایش متن هیرو</h3>
          <p className="layout-hint">این همان متنی است که روی تصویر هیرو در موبایل و دسکتاپ دیده می‌شود.</p>
          <div className="layout-hero-preview">
            <span className="layout-hero-badge">{form.hero_badge || 'بج'}</span>
            <div className="layout-hero-title">
              {previewTitle.length
                ? previewTitle.map((line, i) => <div key={i}>{line}</div>)
                : 'عنوان هیرو'}
            </div>
            <p>{form.hero_subtitle || 'توضیح کوتاه هیرو'}</p>
            <span className="layout-hero-cta">{form.hero_cta_primary || 'دکمه اصلی'}</span>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 14 }}>هیرو — متن، آلبوم عکس و دکمه‌ها</h3>
        <div className="form-grid">
          <label>
            <span>نوع هیرو</span>
            <select
              className="input"
              value={form.hero_mode || 'image'}
              onChange={(e) => set({ hero_mode: e.target.value as '3d' | 'image' })}
            >
              <option value="image">نقاشی جواهر (ثابت — پیشنهادی)</option>
              <option value="3d">۳بعدی اختیاری (فقط بعد از کلیک کاربر)</option>
            </select>
          </label>
          <label>
            <span>بج بالای عنوان</span>
            <input className="input" value={form.hero_badge || ''} onChange={(e) => set({ hero_badge: e.target.value })} />
          </label>
          <label className="full">
            <span>عنوان (هر خط در یک سطر جدا)</span>
            <textarea className="input" rows={3} value={form.hero_title || ''} onChange={(e) => set({ hero_title: e.target.value })} />
          </label>
          <label className="full">
            <span>توضیح کوتاه زیر عنوان</span>
            <textarea className="input" rows={3} value={form.hero_subtitle || ''} onChange={(e) => set({ hero_subtitle: e.target.value })} />
          </label>
          <label>
            <span>متن دکمه اصلی</span>
            <input className="input" value={form.hero_cta_primary || ''} onChange={(e) => set({ hero_cta_primary: e.target.value })} />
          </label>
          <label>
            <span>لینک دکمه اصلی</span>
            <input
              className="input"
              dir="ltr"
              placeholder="/products"
              value={form.hero_cta_primary_url || ''}
              onChange={(e) => set({ hero_cta_primary_url: e.target.value })}
            />
          </label>
          <label>
            <span>متن دکمه فرعی (دسکتاپ)</span>
            <input className="input" value={form.hero_cta_secondary || ''} onChange={(e) => set({ hero_cta_secondary: e.target.value })} />
          </label>
          <label>
            <span>لینک دکمه فرعی</span>
            <input
              className="input"
              dir="ltr"
              placeholder="#market"
              value={form.hero_cta_secondary_url || ''}
              onChange={(e) => set({ hero_cta_secondary_url: e.target.value })}
            />
          </label>
          <div className="full hero-album-admin">
            <span className="hero-album-admin-title">آلبوم هیرو — یک یا چند تصویر</span>
            <p className="layout-hint">
              می‌توانید فقط یک عکس بگذارید یا چند عکس اضافه کنید. روی دسکتاپ داخل قاب ثابت عوض می‌شوند؛ روی موبایل تمام‌صفحه اسلاید می‌خورند.
              اگر آلبوم خالی باشد، تصویر پیش‌فرض گالری نمایش داده می‌شود.
            </p>
            <div className="hero-album-admin-grid">
              {(form.hero_album || []).filter((s) => s.id !== 'legacy').map((slide, idx) => (
                <div key={slide.id} className={`hero-album-admin-card${slide.is_active ? '' : ' is-off'}`}>
                  <img src={slide.image_url || ''} alt={slide.alt_text || 'slide'} />
                  <div className="hero-album-admin-meta">
                    <input
                      className="input"
                      placeholder="عنوان کوتاه (اختیاری)"
                      value={slide.caption || ''}
                      onChange={(e) => {
                        const caption = e.target.value;
                        setForm((f) => f ? {
                          ...f,
                          hero_album: (f.hero_album || []).map((s) =>
                            s.id === slide.id ? { ...s, caption } : s,
                          ),
                        } : f);
                      }}
                      onBlur={(e) => patchSlide.mutate({ id: slide.id, caption: e.target.value })}
                    />
                    <div className="hero-album-admin-actions">
                      <button
                        type="button"
                        className="outline-btn"
                        disabled={idx === 0 || reorderAlbum.isPending}
                        onClick={() => moveSlide(slide.id, -1)}
                      >
                        بالا
                      </button>
                      <button
                        type="button"
                        className="outline-btn"
                        disabled={idx >= (form.hero_album || []).filter((s) => s.id !== 'legacy').length - 1 || reorderAlbum.isPending}
                        onClick={() => moveSlide(slide.id, 1)}
                      >
                        پایین
                      </button>
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => patchSlide.mutate({ id: slide.id, is_active: !slide.is_active })}
                      >
                        {slide.is_active ? 'مخفی' : 'نمایش'}
                      </button>
                      <button
                        type="button"
                        className="outline-btn danger-btn"
                        onClick={() => {
                          if (window.confirm('این عکس از آلبوم حذف شود؟')) deleteSlide.mutate(slide.id);
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hero-album-admin-add">
              <input
                ref={albumInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = '';
                  if (files.length) uploadSlides.mutate(files);
                }}
              />
              <button
                type="button"
                className="gold-btn"
                disabled={uploadSlides.isPending}
                onClick={() => albumInputRef.current?.click()}
              >
                {uploadSlides.isPending ? 'در حال آپلود…' : 'افزودن عکس به آلبوم'}
              </button>
            </div>
          </div>
        </div>
        <SectionSaveBar
          label="ذخیره هیرو"
          pending={savingSection === 'hero'}
          onSave={() => save.mutate('hero')}
        />
      </div>

      <div className="admin-grid-2" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>فوتر و تماس</h3>
          <div className="form-grid">
            <label className="full">
              <span>عنوان بخش اعتماد</span>
              <input className="input" value={form.trust_heading || ''} onChange={(e) => set({ trust_heading: e.target.value })} />
            </label>
            <label className="full">
              <span>متن کوتاه فوتر</span>
              <input className="input" value={form.footer_tagline || ''} onChange={(e) => set({ footer_tagline: e.target.value })} />
            </label>
            <label className="full">
              <span>آدرس</span>
              <input className="input" value={form.contact_address || ''} onChange={(e) => set({ contact_address: e.target.value })} />
            </label>
            <label>
              <span>تلفن</span>
              <input className="input" dir="ltr" value={form.contact_phone || ''} onChange={(e) => set({ contact_phone: e.target.value })} />
            </label>
            <label>
              <span>ایمیل</span>
              <input className="input" dir="ltr" value={form.contact_email || ''} onChange={(e) => set({ contact_email: e.target.value })} />
            </label>
          </div>
          <SectionSaveBar
            label="ذخیره فوتر"
            pending={savingSection === 'footer'}
            onSave={() => save.mutate('footer')}
          />
        </div>

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
          <SectionSaveBar
            label="ذخیره نمایش"
            pending={savingSection === 'visibility'}
            onSave={() => save.mutate('visibility')}
          />
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 14 }}>ترتیب بخش‌های صفحه اصلی</h3>
        <ul className="layout-order-list">
          {(form.section_order || DEFAULT_ORDER).map((key, idx) => (
            <li key={key} className="layout-order-item">
              <span>{SECTION_LABELS[key] || key}</span>
              <span className="layout-order-actions">
                <button type="button" className="outline-btn" disabled={idx === 0} onClick={() => moveSection(idx, -1)}>↑</button>
                <button
                  type="button"
                  className="outline-btn"
                  disabled={idx === (form.section_order || []).length - 1}
                  onClick={() => moveSection(idx, 1)}
                >
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ul>
        <SectionSaveBar
          label="ذخیره ترتیب"
          pending={savingSection === 'order'}
          onSave={() => save.mutate('order')}
        />
      </div>
    </div>
  );
}
