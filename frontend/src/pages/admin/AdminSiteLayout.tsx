import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/endpoints';
import { useToast } from '../../store/toastStore';
import { PageHeader } from './adminShared';
import type { CmsLink, HeroAlbumSlide, SiteCms, SiteSettings } from '../../types';
import { mapsEmbedSrc } from '../../utils/mapsEmbed';

const SECTION_LABELS: Record<string, string> = {
  hero: 'هیرو (تصویر / ۳بعدی)',
  rates: 'نرخ زنده طلا',
  categories: 'دسته‌بندی محصولات',
  featured: 'پرفروش‌ها',
  collection: 'بنر کلکسیون',
  calculator: 'ماشین‌حساب طلا',
  trust: 'اعتماد و قیمت‌گذاری',
  editorial: 'بنر ادیتوریال',
  contact: 'تماس و نقشه',
};

const DEFAULT_ORDER = [
  'hero', 'rates', 'featured', 'categories', 'collection',
  'calculator', 'trust', 'editorial', 'contact',
];

type SaveSection =
  | 'brand'
  | 'hero'
  | 'footer'
  | 'contact'
  | 'cms'
  | 'visibility'
  | 'order'
  | 'all';

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

function LinkListEditor({
  title,
  links,
  onChange,
}: {
  title: string;
  links: CmsLink[];
  onChange: (next: CmsLink[]) => void;
}) {
  return (
    <div className="full" style={{ marginTop: 8 }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{title}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {links.map((link, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
            <input
              className="input"
              placeholder="عنوان"
              value={link.label}
              onChange={(e) => {
                const next = [...links];
                next[i] = { ...next[i], label: e.target.value };
                onChange(next);
              }}
            />
            <input
              className="input"
              dir="ltr"
              placeholder="/path یا #contact"
              value={link.href}
              onChange={(e) => {
                const next = [...links];
                next[i] = { ...next[i], href: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              className="outline-btn danger-btn"
              onClick={() => onChange(links.filter((_, j) => j !== i))}
            >
              حذف
            </button>
          </div>
        ))}
        <button
          type="button"
          className="outline-btn"
          onClick={() => onChange([...links, { label: '', href: '/' }])}
        >
          + افزودن لینک
        </button>
      </div>
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
  const [contactImageFile, setContactImageFile] = useState<File | null>(null);
  const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
  const [momentsImageFile, setMomentsImageFile] = useState<File | null>(null);
  const [collectionImageFile, setCollectionImageFile] = useState<File | null>(null);
  const [editorialImageFile, setEditorialImageFile] = useState<File | null>(null);
  const [savingSection, setSavingSection] = useState<SaveSection | null>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  const setCms = (path: string[], value: unknown) => {
    setForm((prev) => {
      if (!prev) return prev;
      const cms = { ...(prev.cms || {}) } as Record<string, unknown>;
      let cursor: Record<string, unknown> = cms;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        const next = (cursor[key] && typeof cursor[key] === 'object')
          ? { ...(cursor[key] as Record<string, unknown>) }
          : {};
        cursor[key] = next;
        cursor = next;
      }
      cursor[path[path.length - 1]] = value;
      return { ...prev, cms: cms as SiteCms };
    });
  };

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
        fd.append('cms', JSON.stringify({ header: form.cms?.header || {} }));
        fd.append('brand_logo', logoFile);
        return fd;
      }
      return {
        brand_name: form.brand_name || '',
        brand_tagline: form.brand_tagline || '',
        cart_label: form.cart_label || '',
        top_banner: form.top_banner || '',
        cms: { header: form.cms?.header || {} },
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
        footer_copyright: form.footer_copyright || '',
        footer_about_heading: form.footer_about_heading || '',
        contact_phone: form.contact_phone || '',
        contact_email: form.contact_email || '',
        contact_address: form.contact_address || '',
        cms: {
          footer: form.cms?.footer || {},
        },
      };
    }

    if (section === 'contact') {
      if (contactImageFile) {
        const fd = new FormData();
        fd.append('contact_kicker', form.contact_kicker || '');
        fd.append('contact_title', form.contact_title || '');
        fd.append('contact_body', form.contact_body || '');
        fd.append('contact_cta_label', form.contact_cta_label || '');
        fd.append('contact_phone', form.contact_phone || '');
        fd.append('contact_email', form.contact_email || '');
        fd.append('contact_address', form.contact_address || '');
        fd.append('map_embed_url', form.map_embed_url || '');
        fd.append('map_query', form.map_query || '');
        fd.append('cms', JSON.stringify({ map: form.cms?.map || {} }));
        fd.append('contact_image', contactImageFile);
        return fd;
      }
      return {
        contact_kicker: form.contact_kicker || '',
        contact_title: form.contact_title || '',
        contact_body: form.contact_body || '',
        contact_cta_label: form.contact_cta_label || '',
        contact_phone: form.contact_phone || '',
        contact_email: form.contact_email || '',
        contact_address: form.contact_address || '',
        map_embed_url: form.map_embed_url || '',
        map_query: form.map_query || '',
        cms: { map: form.cms?.map || {} },
      };
    }

    if (section === 'cms') {
      if (promoImageFile || momentsImageFile || collectionImageFile || editorialImageFile) {
        const fd = new FormData();
        fd.append('cms', JSON.stringify(form.cms || {}));
        fd.append('trust_heading', form.trust_heading || '');
        if (promoImageFile) fd.append('products_promo_image', promoImageFile);
        if (momentsImageFile) fd.append('moments_image', momentsImageFile);
        if (collectionImageFile) fd.append('collection_image', collectionImageFile);
        if (editorialImageFile) fd.append('editorial_image', editorialImageFile);
        return fd;
      }
      return {
        cms: form.cms || {},
        trust_heading: form.trust_heading || '',
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

    const fd = new FormData();
    const keys = [
      'brand_name', 'brand_tagline', 'cart_label', 'top_banner',
      'hero_badge', 'hero_title', 'hero_subtitle', 'hero_mode',
      'hero_cta_primary', 'hero_cta_secondary',
      'hero_cta_primary_url', 'hero_cta_secondary_url',
      'trust_heading', 'footer_tagline', 'footer_copyright', 'footer_about_heading',
      'contact_phone', 'contact_email', 'contact_address',
      'contact_kicker', 'contact_title', 'contact_body', 'contact_cta_label',
      'map_embed_url', 'map_query',
    ] as const;
    keys.forEach((k) => {
      const v = form[k];
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    fd.append('show_rates', String(!!form.show_rates));
    fd.append('show_categories', String(!!form.show_categories));
    fd.append('show_featured', String(!!form.show_featured));
    fd.append('show_trust', String(!!form.show_trust));
    fd.append('section_order', JSON.stringify(form.section_order || DEFAULT_ORDER));
    fd.append('cms', JSON.stringify(form.cms || {}));
    if (logoFile) fd.append('brand_logo', logoFile);
    if (contactImageFile) fd.append('contact_image', contactImageFile);
    if (promoImageFile) fd.append('products_promo_image', promoImageFile);
    if (momentsImageFile) fd.append('moments_image', momentsImageFile);
    if (collectionImageFile) fd.append('collection_image', collectionImageFile);
    if (editorialImageFile) fd.append('editorial_image', editorialImageFile);
    return fd;
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
      if (section === 'contact' || section === 'all') setContactImageFile(null);
      if (section === 'cms' || section === 'all') {
        setPromoImageFile(null);
        setMomentsImageFile(null);
        setCollectionImageFile(null);
        setEditorialImageFile(null);
      }
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
  const cms = form.cms || {};
  const mapPreview = mapsEmbedSrc(form as SiteSettings);
  const whyItems = cms.why_anil?.items?.length
    ? cms.why_anil.items
    : [
        { title: '', body: '' },
        { title: '', body: '' },
        { title: '', body: '' },
        { title: '', body: '' },
      ];

  return (
    <div>
      <PageHeader
        title="چیدمان فروشگاه"
        subtitle="هر جزئیات فروشگاه از اینجا قابل ویرایش است — بعد از تغییر همان بخش را ذخیره کنید"
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
              <span>جای‌نگهدار جستجو در هدر</span>
              <input
                className="input"
                value={cms.header?.search_placeholder || ''}
                onChange={(e) => setCms(['header', 'search_placeholder'], e.target.value)}
              />
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
          <SectionSaveBar
            pending={savingSection === 'brand'}
            onSave={() => save.mutate('brand')}
          />
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

      <div className="admin-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 14 }}>تماس، آدرس و نقشه واقعی گوگل</h3>
        <p className="layout-hint">
          نقشه واقعی Google Maps نمایش داده می‌شود. یا آدرس/عبارت جستجو را وارد کنید، یا لینک embed را از گوگل‌مپ بچسبانید.
        </p>
        <div className="form-grid">
          <label>
            <span>کicker بخش تماس</span>
            <input className="input" value={form.contact_kicker || ''} onChange={(e) => set({ contact_kicker: e.target.value })} />
          </label>
          <label>
            <span>عنوان بخش تماس</span>
            <input className="input" value={form.contact_title || ''} onChange={(e) => set({ contact_title: e.target.value })} />
          </label>
          <label className="full">
            <span>متن بخش تماس</span>
            <textarea className="input" rows={3} value={form.contact_body || ''} onChange={(e) => set({ contact_body: e.target.value })} />
          </label>
          <label>
            <span>متن دکمه تماس</span>
            <input className="input" value={form.contact_cta_label || ''} onChange={(e) => set({ contact_cta_label: e.target.value })} />
          </label>
          <label>
            <span>تلفن</span>
            <input className="input" dir="ltr" value={form.contact_phone || ''} onChange={(e) => set({ contact_phone: e.target.value })} />
          </label>
          <label>
            <span>ایمیل</span>
            <input className="input" dir="ltr" value={form.contact_email || ''} onChange={(e) => set({ contact_email: e.target.value })} />
          </label>
          <label className="full">
            <span>آدرس نمایشی</span>
            <input className="input" value={form.contact_address || ''} onChange={(e) => set({ contact_address: e.target.value })} />
          </label>
          <label className="full">
            <span>عبارت جستجوی نقشه (اگر خالی باشد از آدرس استفاده می‌شود)</span>
            <input
              className="input"
              dir="ltr"
              placeholder="گالری طلای آنیل، ابهر"
              value={form.map_query || ''}
              onChange={(e) => set({ map_query: e.target.value })}
            />
          </label>
          <label className="full">
            <span>لینک embed گوگل‌مپ (اختیاری — اولویت بالاتر)</span>
            <textarea
              className="input"
              dir="ltr"
              rows={2}
              placeholder="https://www.google.com/maps/embed?pb=... یا کل تگ iframe"
              value={form.map_embed_url || ''}
              onChange={(e) => set({ map_embed_url: e.target.value })}
            />
          </label>
          <label>
            <span>متن لینک «باز کردن نقشه»</span>
            <input
              className="input"
              value={cms.map?.open_label || ''}
              onChange={(e) => setCms(['map', 'open_label'], e.target.value)}
            />
          </label>
          <label className="full">
            <span>تصویر فضای گالری (کنار نقشه)</span>
            {(form.contact_image_url || contactImageFile) && (
              <img
                className="layout-preview-logo"
                src={contactImageFile ? URL.createObjectURL(contactImageFile) : form.contact_image_url!}
                alt="contact"
                style={{ maxHeight: 120, objectFit: 'cover', borderRadius: 8 }}
              />
            )}
            <input type="file" accept="image/*" onChange={(e) => setContactImageFile(e.target.files?.[0] || null)} />
          </label>
          <div className="full" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', minHeight: 220 }}>
            <iframe
              title="پیش‌نمایش نقشه"
              src={mapPreview}
              style={{ width: '100%', height: 240, border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
        <SectionSaveBar
          label="ذخیره تماس و نقشه"
          pending={savingSection === 'contact'}
          onSave={() => save.mutate('contact')}
        />
      </div>

      <div className="admin-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 14 }}>متون صفحه اصلی (منتخب، دسته، ماشین‌حساب، نرخ)</h3>
        <div className="form-grid">
          {([
            ['featured_title', 'عنوان محصولات منتخب'],
            ['featured_subtitle', 'زیرعنوان منتخب'],
            ['featured_all', 'متن دکمه مشاهده همه'],
            ['categories_title', 'عنوان دسته‌بندی‌ها'],
            ['categories_subtitle', 'زیرعنوان دسته‌بندی‌ها'],
            ['categories_all', 'متن دکمه همه دسته‌ها'],
            ['category_cta', 'متن CTA روی کارت دسته'],
            ['calculator_title', 'عنوان ماشین‌حساب'],
            ['calculator_subtitle', 'زیرعنوان ماشین‌حساب'],
            ['calculator_weight_label', 'برچسب وزن'],
            ['calculator_karat_label', 'برچسب عیار'],
            ['calculator_result_label', 'برچسب نتیجه'],
            ['rates_live', 'متن نرخ زنده'],
            ['rates_stale', 'متن نرخ قدیمی'],
            ['rates_empty', 'متن نبود نرخ'],
          ] as const).map(([key, label]) => (
            <label key={key} className={key.includes('subtitle') || key.includes('empty') ? 'full' : undefined}>
              <span>{label}</span>
              <input
                className="input"
                value={(cms.home as Record<string, string> | undefined)?.[key] || ''}
                onChange={(e) => setCms(['home', key], e.target.value)}
              />
            </label>
          ))}
        </div>
        <SectionSaveBar label="ذخیره متون صفحه اصلی" pending={savingSection === 'cms'} onSave={() => save.mutate('cms')} />
      </div>

      <div className="admin-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 14 }}>چرا آنیل؟ — عنوان و کارت‌ها</h3>
        <div className="form-grid">
          <label className="full">
            <span>عنوان بخش</span>
            <input className="input" value={form.trust_heading || ''} onChange={(e) => set({ trust_heading: e.target.value })} />
          </label>
          <label className="full">
            <span>زیرعنوان</span>
            <input
              className="input"
              value={cms.why_anil?.subtitle || ''}
              onChange={(e) => setCms(['why_anil', 'subtitle'], e.target.value)}
            />
          </label>
          {whyItems.map((item, i) => (
            <div key={i} className="full" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
              <label>
                <span>عنوان کارت {i + 1}</span>
                <input
                  className="input"
                  value={item.title}
                  onChange={(e) => {
                    const next = whyItems.map((it, j) => (j === i ? { ...it, title: e.target.value } : it));
                    setCms(['why_anil', 'items'], next);
                  }}
                />
              </label>
              <label>
                <span>متن کارت {i + 1}</span>
                <input
                  className="input"
                  value={item.body}
                  onChange={(e) => {
                    const next = whyItems.map((it, j) => (j === i ? { ...it, body: e.target.value } : it));
                    setCms(['why_anil', 'items'], next);
                  }}
                />
              </label>
            </div>
          ))}
        </div>
        <SectionSaveBar
          label="ذخیره چرا آنیل"
          pending={savingSection === 'cms'}
          onSave={() => save.mutate('cms')}
        />
      </div>

      <div className="admin-grid-2" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>بنر کلکسیون (صفحه اصلی)</h3>
          <div className="form-grid">
            <label className="full">
              <span>عنوان</span>
              <input className="input" value={cms.collection?.title || ''} onChange={(e) => setCms(['collection', 'title'], e.target.value)} />
            </label>
            <label className="full">
              <span>زیرعنوان</span>
              <input className="input" value={cms.collection?.subtitle || ''} onChange={(e) => setCms(['collection', 'subtitle'], e.target.value)} />
            </label>
            <label>
              <span>متن دکمه</span>
              <input className="input" value={cms.collection?.cta_label || ''} onChange={(e) => setCms(['collection', 'cta_label'], e.target.value)} />
            </label>
            <label>
              <span>لینک دکمه</span>
              <input className="input" dir="ltr" value={cms.collection?.cta_url || ''} onChange={(e) => setCms(['collection', 'cta_url'], e.target.value)} />
            </label>
            <label className="full">
              <span>تصویر بنر</span>
              {(form.collection_image_url || collectionImageFile) && (
                <img
                  className="layout-preview-logo"
                  src={collectionImageFile ? URL.createObjectURL(collectionImageFile) : form.collection_image_url!}
                  alt="collection"
                  style={{ maxHeight: 100, objectFit: 'cover', borderRadius: 8 }}
                />
              )}
              <input type="file" accept="image/*" onChange={(e) => setCollectionImageFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>بنر ادیتوریال (صفحه اصلی)</h3>
          <div className="form-grid">
            <label className="full">
              <span>عنوان</span>
              <input className="input" value={cms.editorial?.title || ''} onChange={(e) => setCms(['editorial', 'title'], e.target.value)} />
            </label>
            <label className="full">
              <span>زیرعنوان</span>
              <input className="input" value={cms.editorial?.subtitle || ''} onChange={(e) => setCms(['editorial', 'subtitle'], e.target.value)} />
            </label>
            <label>
              <span>متن دکمه</span>
              <input className="input" value={cms.editorial?.cta_label || ''} onChange={(e) => setCms(['editorial', 'cta_label'], e.target.value)} />
            </label>
            <label>
              <span>لینک دکمه</span>
              <input className="input" dir="ltr" value={cms.editorial?.cta_url || ''} onChange={(e) => setCms(['editorial', 'cta_url'], e.target.value)} />
            </label>
            <label className="full">
              <span>تصویر بنر</span>
              {(form.editorial_image_url || editorialImageFile) && (
                <img
                  className="layout-preview-logo"
                  src={editorialImageFile ? URL.createObjectURL(editorialImageFile) : form.editorial_image_url!}
                  alt="editorial"
                  style={{ maxHeight: 100, objectFit: 'cover', borderRadius: 8 }}
                />
              )}
              <input type="file" accept="image/*" onChange={(e) => setEditorialImageFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
      </div>

      <div className="admin-grid-2" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>بنر پرومو محصولات</h3>
          <div className="form-grid">
            <label className="full">
              <span>عنوان</span>
              <input className="input" value={cms.products_promo?.title || ''} onChange={(e) => setCms(['products_promo', 'title'], e.target.value)} />
            </label>
            <label className="full">
              <span>زیرعنوان</span>
              <input className="input" value={cms.products_promo?.subtitle || ''} onChange={(e) => setCms(['products_promo', 'subtitle'], e.target.value)} />
            </label>
            <label>
              <span>متن دکمه</span>
              <input className="input" value={cms.products_promo?.cta_label || ''} onChange={(e) => setCms(['products_promo', 'cta_label'], e.target.value)} />
            </label>
            <label>
              <span>لینک دکمه</span>
              <input className="input" dir="ltr" value={cms.products_promo?.cta_url || ''} onChange={(e) => setCms(['products_promo', 'cta_url'], e.target.value)} />
            </label>
            <label className="full">
              <span>تصویر</span>
              {(form.products_promo_image_url || promoImageFile) && (
                <img
                  className="layout-preview-logo"
                  src={promoImageFile ? URL.createObjectURL(promoImageFile) : form.products_promo_image_url!}
                  alt="promo"
                  style={{ maxHeight: 100, objectFit: 'cover', borderRadius: 8 }}
                />
              )}
              <input type="file" accept="image/*" onChange={(e) => setPromoImageFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>بخش لحظه‌ها (صفحات فرعی)</h3>
          <div className="form-grid">
            <label className="full">
              <span>عنوان</span>
              <input className="input" value={cms.moments?.title || ''} onChange={(e) => setCms(['moments', 'title'], e.target.value)} />
            </label>
            <label className="full">
              <span>زیرعنوان</span>
              <input className="input" value={cms.moments?.subtitle || ''} onChange={(e) => setCms(['moments', 'subtitle'], e.target.value)} />
            </label>
            <label>
              <span>متن دکمه</span>
              <input className="input" value={cms.moments?.cta_label || ''} onChange={(e) => setCms(['moments', 'cta_label'], e.target.value)} />
            </label>
            <label>
              <span>لینک دکمه</span>
              <input className="input" dir="ltr" value={cms.moments?.cta_url || ''} onChange={(e) => setCms(['moments', 'cta_url'], e.target.value)} />
            </label>
            <label className="full">
              <span>تصویر</span>
              {(form.moments_image_url || momentsImageFile) && (
                <img
                  className="layout-preview-logo"
                  src={momentsImageFile ? URL.createObjectURL(momentsImageFile) : form.moments_image_url!}
                  alt="moments"
                  style={{ maxHeight: 100, objectFit: 'cover', borderRadius: 8 }}
                />
              )}
              <input type="file" accept="image/*" onChange={(e) => setMomentsImageFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 0 }}>
        <SectionSaveBar label="ذخیره بنرها و تصاویر" pending={savingSection === 'cms'} onSave={() => save.mutate('cms')} />
      </div>

      <div className="admin-grid-2" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>مجله / بلاگ</h3>
          <div className="form-grid">
            {([
              ['hero_title', 'عنوان هیرو'],
              ['hero_subtitle', 'زیرعنوان'],
              ['hero_lead', 'متن معرفی'],
              ['latest_kicker', 'کicker لیست'],
              ['latest_title', 'عنوان لیست'],
              ['cta_label', 'متن دکمه مقاله'],
            ] as const).map(([key, label]) => (
              <label key={key} className={key === 'hero_lead' ? 'full' : undefined}>
                <span>{label}</span>
                {key === 'hero_lead' ? (
                  <textarea
                    className="input"
                    rows={2}
                    value={cms.blog?.[key] || ''}
                    onChange={(e) => setCms(['blog', key], e.target.value)}
                  />
                ) : (
                  <input
                    className="input"
                    value={cms.blog?.[key] || ''}
                    onChange={(e) => setCms(['blog', key], e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>صفحه محصولات — برچسب‌ها</h3>
          <div className="form-grid">
            {([
              ['crumb_home', 'متن خانه در مسیر'],
              ['all_label', 'عنوان همه محصولات'],
              ['filter_label', 'برچسب فیلتر'],
              ['sort_label', 'برچسب مرتب‌سازی'],
              ['load_more', 'دکمه بیشتر'],
              ['empty', 'پیام خالی بودن'],
            ] as const).map(([key, label]) => (
              <label key={key} className={key === 'empty' ? 'full' : undefined}>
                <span>{label}</span>
                <input
                  className="input"
                  value={cms.products_page?.[key] || ''}
                  onChange={(e) => setCms(['products_page', key], e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
      <SectionSaveBar label="ذخیره بلاگ و محصولات" pending={savingSection === 'cms'} onSave={() => save.mutate('cms')} />

      <div className="admin-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 14 }}>فوتر — ستون‌ها و لینک‌ها</h3>
        <div className="form-grid">
          <label className="full">
            <span>متن کوتاه فوتر (درباره)</span>
            <input className="input" value={form.footer_tagline || ''} onChange={(e) => set({ footer_tagline: e.target.value })} />
          </label>
          <label>
            <span>عنوان ستون درباره</span>
            <input
              className="input"
              value={cms.footer?.about_title || form.footer_about_heading || ''}
              onChange={(e) => {
                set({ footer_about_heading: e.target.value });
                setCms(['footer', 'about_title'], e.target.value);
              }}
            />
          </label>
          <label>
            <span>کپی‌رایت</span>
            <input className="input" value={form.footer_copyright || ''} onChange={(e) => set({ footer_copyright: e.target.value })} />
          </label>
          <label>
            <span>عنوان خدمات مشتریان</span>
            <input className="input" value={cms.footer?.customers_title || ''} onChange={(e) => setCms(['footer', 'customers_title'], e.target.value)} />
          </label>
          <label>
            <span>عنوان دسته‌بندی‌ها</span>
            <input className="input" value={cms.footer?.categories_title || ''} onChange={(e) => setCms(['footer', 'categories_title'], e.target.value)} />
          </label>
          <label>
            <span>عنوان دسترسی سریع</span>
            <input className="input" value={cms.footer?.quick_title || ''} onChange={(e) => setCms(['footer', 'quick_title'], e.target.value)} />
          </label>
          <label>
            <span>آدرس وب‌سایت (آیکون فوتر)</span>
            <input
              className="input"
              dir="ltr"
              value={cms.footer?.website_url || ''}
              onChange={(e) => setCms(['footer', 'website_url'], e.target.value)}
            />
          </label>
          <LinkListEditor
            title="لینک‌های خدمات مشتریان"
            links={cms.footer?.customers_links || []}
            onChange={(next) => setCms(['footer', 'customers_links'], next)}
          />
          <LinkListEditor
            title="لینک‌های دسترسی سریع"
            links={cms.footer?.quick_links || []}
            onChange={(next) => setCms(['footer', 'quick_links'], next)}
          />
          <LinkListEditor
            title="لینک‌های قانونی پایین صفحه"
            links={cms.footer?.legal_links || []}
            onChange={(next) => setCms(['footer', 'legal_links'], next)}
          />
        </div>
        <SectionSaveBar
          label="ذخیره فوتر"
          pending={savingSection === 'footer'}
          onSave={() => save.mutate('footer')}
        />
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
          <SectionSaveBar
            label="ذخیره نمایش"
            pending={savingSection === 'visibility'}
            onSave={() => save.mutate('visibility')}
          />
        </div>

        <div className="admin-card">
          <h3 style={{ marginBottom: 14 }}>یادداشت‌های عملیات (پنل تنظیمات)</h3>
          <div className="form-grid">
            <label>
              <span>آستانه موجودی کم</span>
              <input
                className="input"
                type="number"
                value={cms.ops?.low_stock_threshold ?? 2}
                onChange={(e) => setCms(['ops', 'low_stock_threshold'], Number(e.target.value))}
              />
            </label>
            <label className="full">
              <span>متن ارسال</span>
              <textarea
                className="input"
                rows={2}
                value={cms.ops?.shipping_note || ''}
                onChange={(e) => setCms(['ops', 'shipping_note'], e.target.value)}
              />
            </label>
            <label className="full">
              <span>یادداشت مالیات</span>
              <textarea
                className="input"
                rows={2}
                value={cms.ops?.tax_note || ''}
                onChange={(e) => setCms(['ops', 'tax_note'], e.target.value)}
              />
            </label>
          </div>
          <SectionSaveBar label="ذخیره عملیات" pending={savingSection === 'cms'} onSave={() => save.mutate('cms')} />
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
