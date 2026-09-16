import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/endpoints';
import { faNum, faPrice } from '../../utils/format';
import { bestProductSeo, suggestProductSeo, type SeoSuggestion } from '../../utils/productSeo';
import { useToast } from '../../store/toastStore';
import type { Product } from '../../types';
import { PageHeader } from './adminShared';

class ModalErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(err: Error) {
    return { error: err?.message || 'خطای نمایش فرم' };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="admin-edit-modal-body">
          <div className="admin-form-error">
            نمایش فرم با خطا روبه‌رو شد: {this.state.error}
          </div>
          <button
            type="button"
            className="outline-btn"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            بستن و تلاش دوباره
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function productThumb(p: any): string | null {
  return (
    p?.primary_image
    || p?.images?.[0]?.image_url
    || p?.images?.[0]?.image
    || null
  );
}

function imageUrl(img: any): string {
  return String(img?.image_url || img?.image || '');
}

function normalizeImages(images: any[] | undefined | null) {
  return (images || [])
    .map((img) => ({
      id: img.id,
      image: img.image,
      image_url: img.image_url || img.image,
      alt: img.alt || '',
      order: img.order ?? 0,
      is_primary: !!img.is_primary,
    }))
    .filter((img) => img.id && imageUrl(img));
}

const empty = {
  name: '', slug: '', category: '', weight_g: '4', karat: 18, fee_ratio: '0.20',
  stone_value: 0, tag: '', description: '', placeholder_label: '', sku: '',
  stock: 5, is_active: true, is_featured: false, meta_title: '', meta_description: '',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'نام محصول',
  slug: 'اسلاگ',
  category: 'دسته‌بندی',
  weight_g: 'وزن',
  karat: 'عیار',
  fee_ratio: 'اجرت',
  stone_value: 'ارزش سنگ',
  stock: 'موجودی',
  sku: 'کد کالا',
  non_field_errors: 'خطا',
  detail: 'خطا',
};

function toLatinDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function parseNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = toLatinDigits(String(value ?? '')).trim().replace(/,/g, '');
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function slugifyName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

function formatApiError(data: unknown, status?: number): string {
  if (!data) {
    if (status === 413) return 'حجم تصویر بیش از حد مجاز سرور است.';
    if (status && status >= 500) return 'خطای سرور هنگام ذخیره تصویر. دوباره تلاش کنید.';
    return 'خطا در ذخیره';
  }
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('<!') || trimmed.toLowerCase().includes('<html')) {
      return status && status >= 500
        ? 'خطای سرور هنگام آپلود تصویر. دسترسی پوشه media یا حجم فایل را بررسی کنید.'
        : 'پاسخ نامعتبر از سرور دریافت شد.';
    }
    return trimmed.slice(0, 280) || 'خطا در ذخیره';
  }
  if (typeof data !== 'object') return 'خطا در ذخیره';
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === 'string') return obj.detail;
  const parts: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const label = FIELD_LABELS[key] || key;
    const msg = Array.isArray(val) ? val.join('، ') : String(val);
    parts.push(`${label}: ${msg}`);
  }
  return parts.join(' · ') || 'خطا در ذخیره';
}

export function AdminProducts() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.adminProducts({ page_size: '100' }).then((r) => r.data.results),
  });
  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.adminCategories().then((r) => r.data),
  });

  const [form, setForm] = useState<any>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState('');
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPendingPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingFiles]);

  useEffect(() => {
    if (!form) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        toast('برای ادامه، ابتدا پنجره ویرایش را ببندید');
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey, true);
    };
  }, [form, toast]);

  const closeForm = () => {
    setForm(null);
    setFormError('');
    setPendingFiles([]);
    setRemovingImageId(null);
  };


  const save = useMutation({
    mutationFn: async () => {
      setFormError('');
      if (!String(form?.name || '').trim()) {
        throw { response: { data: { name: ['نام محصول الزامی است.'] } } };
      }
      if (!form?.category) {
        throw { response: { data: { category: ['دسته‌بندی را انتخاب کنید.'] } } };
      }

      const weightRaw = String(form.weight_g ?? '').trim();
      const weight = weightRaw === '' ? null : parseNumber(form.weight_g, NaN);
      if (weight != null && (!Number.isFinite(weight) || weight <= 0)) {
        throw { response: { data: { weight_g: ['وزن معتبر وارد کنید یا خالی بگذارید.'] } } };
      }

      const autoSlug = slugifyName(form.name);
      const categoryName = categories?.find((c) => c.id === form.category)?.name || '';
      const seoFallback = bestProductSeo({
        name: form.name,
        categoryName,
        weight_g: weight ?? undefined,
        karat: Number(form.karat) || 18,
        tag: form.tag || '',
        sku: form.sku || '',
        description: form.description || '',
      });
      const payload = {
        name: String(form.name).trim(),
        slug: String(form.slug || '').trim() || autoSlug,
        category: form.category,
        weight_g: weight,
        fee_ratio: parseNumber(form.fee_ratio, 0.2),
        stone_value: Math.round(parseNumber(form.stone_value, 0)),
        stock: Math.max(0, Math.round(parseNumber(form.stock, 0))),
        karat: Number(form.karat) || 18,
        tag: form.tag || '',
        description: form.description || '',
        placeholder_label: form.placeholder_label || '',
        sku: String(form.sku || '').trim() || null,
        is_active: form.is_active !== false,
        is_featured: !!form.is_featured,
        meta_title: String(form.meta_title || '').trim() || seoFallback?.meta_title || '',
        meta_description: String(form.meta_description || '').trim() || seoFallback?.meta_description || '',
      };

      let product: Product;
      if (form.id) {
        product = (await api.adminUpdateProduct(form.id, payload)).data;
      } else {
        product = (await api.adminCreateProduct(payload)).data;
      }
      if (pendingFiles.length) {
        try {
          const existingCount = normalizeImages(form.images).length;
          for (let i = 0; i < pendingFiles.length; i += 1) {
            const makePrimary = existingCount === 0 && i === 0;
            await api.adminUploadImage(product.id, pendingFiles[i], makePrimary);
          }
        } catch (uploadErr: any) {
          const msg = formatApiError(uploadErr?.response?.data, uploadErr?.response?.status);
          throw Object.assign(new Error(msg), {
            response: uploadErr?.response,
            isImageUpload: true,
            productSaved: true,
          });
        }
      }
      return product;
    },
    onSuccess: () => {
      toast('محصول ذخیره شد');
      closeForm();
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (e: any) => {
      const msg = formatApiError(e?.response?.data, e?.response?.status);
      const prefix = e?.isImageUpload || e?.productSaved ? 'محصول ذخیره شد؛ خطا در آپلود تصویر: ' : '';
      const full = `${prefix}${msg}`;
      setFormError(full);
      toast(full);
      if (e?.productSaved) {
        qc.invalidateQueries({ queryKey: ['admin-products'] });
        qc.invalidateQueries({ queryKey: ['products'] });
      }
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.adminDeleteProduct(id),
    onSuccess: () => {
      toast('حذف شد');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.adminUpdateProduct(id, body),
    onSuccess: () => {
      toast('به‌روز شد');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const applySeoAll = useMutation({
    mutationFn: () => api.adminApplyAutoSeo(false),
    onSuccess: (res) => {
      toast(`سئوی هوشمند برای ${faNum(res.data.updated)} محصول اعمال شد`);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => toast('اعمال سئو ناموفق بود'),
  });

  const products = useMemo(() => {
    let list = (productsData ?? []) as any[];
    if (onlyLow) list = list.filter((p) => (p.stock ?? 0) <= 2);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((p) =>
        `${p.name} ${p.sku || ''} ${p.category_name}`.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [productsData, q, onlyLow]);

  const onNameChange = (name: string) => {
    setForm((prev: any) => {
      if (!prev) return prev;
      const shouldAutoSlug = !prev.id && (!prev.slug || prev.slug === slugifyName(prev.name));
      return {
        ...prev,
        name,
        slug: shouldAutoSlug ? slugifyName(name) : prev.slug,
      };
    });
  };

  const categoryName = categories?.find((c) => c.id === form?.category)?.name || '';
  const seoSuggestions = useMemo(() => {
    if (!form?.name?.trim()) return [] as SeoSuggestion[];
    return suggestProductSeo({
      name: form.name,
      categoryName,
      weight_g: form.weight_g,
      karat: form.karat,
      tag: form.tag,
      sku: form.sku,
      description: form.description,
    });
  }, [form?.name, form?.weight_g, form?.karat, form?.tag, form?.sku, form?.description, categoryName]);

  const applySeo = (s: SeoSuggestion) => {
    setForm((prev: any) => prev ? ({
      ...prev,
      meta_title: s.meta_title,
      meta_description: s.meta_description,
      _seoAppliedId: s.id,
    }) : prev);
    toast(`سئو «${s.label}» اعمال شد`);
  };

  const applyBestSeo = () => {
    if (!seoSuggestions[0]) {
      toast('اول نام محصول را وارد کنید');
      return;
    }
    applySeo(seoSuggestions[0]);
  };

  const openProductForm = async (p: any) => {
    setFormError('');
    setPendingFiles([]);
    setOpeningId(p.id);
    try {
      const full = p?.id ? (await api.adminProduct(p.id)).data : p;
      const images = normalizeImages(full.images);
      setForm({
        id: full.id,
        name: full.name,
        slug: full.slug,
        category: full.category || categories?.find((c) => c.name === full.category_name)?.id,
        weight_g: full.weight_g ?? '',
        karat: full.karat ?? 18,
        fee_ratio: full.fee_ratio ?? '0.20',
        stone_value: full.stone_value ?? 0,
        tag: full.tag || '',
        description: full.description || '',
        placeholder_label: full.placeholder_label || '',
        sku: full.sku || '',
        stock: full.stock ?? 1,
        is_active: full.is_active ?? true,
        is_featured: full.is_featured,
        meta_title: full.meta_title || '',
        meta_description: full.meta_description || '',
        primary_image: productThumb(full),
        images,
      });
    } catch (err: any) {
      toast(formatApiError(err?.response?.data, err?.response?.status));
    } finally {
      setOpeningId(null);
    }
  };

  const ingestFiles = async (files: File[]) => {
    if (!files.length || !form) return;
    // Existing product: upload immediately so the user sees results now
    if (form.id) {
      setUploading(true);
      try {
        const existingCount = normalizeImages(form.images).length;
        for (let i = 0; i < files.length; i += 1) {
          const makePrimary = existingCount === 0 && i === 0;
          await api.adminUploadImage(form.id, files[i], makePrimary);
        }
        const refreshed = (await api.adminProduct(form.id)).data;
        setForm((f: any) =>
          f
            ? {
                ...f,
                images: normalizeImages(refreshed.images),
                primary_image: productThumb(refreshed),
              }
            : f,
        );
        toast(`${files.length} تصویر افزوده شد`);
        qc.invalidateQueries({ queryKey: ['admin-products'] });
        qc.invalidateQueries({ queryKey: ['products'] });
      } catch (err: any) {
        toast(formatApiError(err?.response?.data, err?.response?.status));
      } finally {
        setUploading(false);
      }
      return;
    }
    // New product: queue until save
    setPendingFiles((prev) => [...prev, ...files]);
  };

  return (
    <div>
      <PageHeader
        title="کاتالوگ محصولات"
        subtitle={`${faNum(products.length)} مورد · ویرایش در پنجره شناور · سئوی هوشمند`}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="outline-btn"
              type="button"
              disabled={applySeoAll.isPending || !!form}
              onClick={() => {
                if (confirm('سئوی هوشمند برای همه محصولات اعمال شود؟ (عنوان و توضیح متا بازنویسی می‌شود)')) {
                  applySeoAll.mutate();
                }
              }}
            >
              {applySeoAll.isPending ? 'در حال اعمال سئو…' : 'اعمال سئو روی همه'}
            </button>
            <button
              className="gold-btn"
              type="button"
              disabled={!!form}
              onClick={() => {
                setFormError('');
                setPendingFiles([]);
                setForm({ ...empty, category: categories?.[0]?.id || '', images: [], primary_image: null });
              }}
            >
              + محصول جدید
            </button>
          </div>
        }
      />

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="جستجوی نام / SKU / دسته"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="button"
          className={`filter-chip${onlyLow ? ' active' : ''}`}
          onClick={() => setOnlyLow((v) => !v)}
        >
          فقط موجودی کم
        </button>
      </div>

      {form && createPortal(
        <div className="admin-edit-lock" role="presentation">
          <div className="admin-edit-backdrop" aria-hidden />
          <div
            className="admin-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-product-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalErrorBoundary onReset={closeForm}>
            <div className="admin-edit-modal-head">
              <div>
                <h3 id="admin-product-edit-title">{form.id ? 'ویرایش محصول' : 'محصول جدید'}</h3>
                <p className="layout-hint">تا وقتی این پنجره باز است، به بخش‌های دیگر پنل دسترسی ندارید.</p>
              </div>
              <button type="button" className="outline-btn" onClick={closeForm}>بستن</button>
            </div>
            <div className="admin-edit-modal-body">
              <div className="form-grid product-form-grid">
                <label>
                  <span>نام محصول *</span>
                  <input className="input" value={form.name ?? ''} onChange={(e) => onNameChange(e.target.value)} />
                </label>
                <label>
                  <span>اسلاگ (اختیاری — خودکار از نام)</span>
                  <input className="input" value={form.slug ?? ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" />
                </label>
                <label>
                  <span>دسته‌بندی *</span>
                  <select className="input" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">انتخاب دسته</option>
                    {(categories || []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>کد کالا (SKU)</span>
                  <input className="input" value={form.sku ?? ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </label>
                <label>
                  <span>وزن (گرم) *</span>
                  <input className="input" value={form.weight_g ?? ''} onChange={(e) => setForm({ ...form, weight_g: e.target.value })} />
                </label>
                <label>
                  <span>عیار</span>
                  <select className="input" value={form.karat ?? 18} onChange={(e) => setForm({ ...form, karat: Number(e.target.value) })}>
                    <option value={18}>۱۸ عیار</option>
                    <option value={21}>۲۱ عیار</option>
                    <option value={22}>۲۲ عیار</option>
                    <option value={24}>۲۴ عیار</option>
                  </select>
                </label>
                <label>
                  <span>اجرت (نسبت، مثلاً 0.22)</span>
                  <input className="input" value={form.fee_ratio ?? ''} onChange={(e) => setForm({ ...form, fee_ratio: e.target.value })} />
                </label>
                <label>
                  <span>ارزش سنگ / نگین (تومان)</span>
                  <input className="input" value={form.stone_value ?? 0} onChange={(e) => setForm({ ...form, stone_value: e.target.value })} />
                </label>
                <label>
                  <span>موجودی</span>
                  <input className="input" type="number" value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </label>
                <label>
                  <span>برچسب</span>
                  <select className="input" value={form.tag ?? ''} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
                    <option value="">بدون برچسب</option>
                    <option value="پرفروش">پرفروش</option>
                    <option value="جدید">جدید</option>
                    <option value="ویژه">ویژه</option>
                  </select>
                </label>
                <label>
                  <span>برچسب جایگزین تصویر</span>
                  <input className="input" value={form.placeholder_label ?? ''} onChange={(e) => setForm({ ...form, placeholder_label: e.target.value })} />
                </label>
                <label className="full">
                  <span>توضیحات کامل</span>
                  <textarea className="input" rows={4} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </label>

                <div className="full seo-smart-box">
                  <div className="seo-smart-head">
                    <div>
                      <h4>سئوی هوشمند محصول</h4>
                      <p>بر اساس نام، دسته، وزن و عیار، بهترین عنوان و توضیح متا پیشنهاد می‌شود.</p>
                    </div>
                    <button type="button" className="gold-btn" onClick={applyBestSeo} disabled={!seoSuggestions.length}>
                      پیشنهاد برتر را پر کن
                    </button>
                  </div>
                  {seoSuggestions.length > 0 ? (
                    <div className="seo-suggest-list">
                      {seoSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`seo-suggest-card${form._seoAppliedId === s.id || (form.meta_title === s.meta_title && form.meta_description === s.meta_description) ? ' on' : ''}`}
                          onClick={() => applySeo(s)}
                        >
                          <div className="seo-suggest-top">
                            <strong>{s.label}</strong>
                            <span>امتیاز {faNum(s.score)}</span>
                          </div>
                          <div className="seo-suggest-title">{s.meta_title}</div>
                          <div className="seo-suggest-desc">{s.meta_description}</div>
                          <div className="seo-suggest-keys">
                            {(s.keywords || []).slice(0, 4).map((k) => (
                              <span key={k}>{k}</span>
                            ))}
                          </div>
                          <div className="seo-suggest-tip">{(s.tips && s.tips[0]) || ''}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="layout-hint">برای دیدن پیشنهادها، نام محصول را بنویسید.</p>
                  )}
                </div>

                <label className="full">
                  <span>
                    عنوان سئو (meta title)
                    <em className="seo-count">{faNum((form.meta_title || '').length)} / ۶۰</em>
                  </span>
                  <input className="input" value={form.meta_title ?? ''} onChange={(e) => setForm({ ...form, meta_title: e.target.value, _seoAppliedId: '' })} />
                </label>
                <label className="full">
                  <span>
                    توضیح سئو (meta description)
                    <em className="seo-count">{faNum((form.meta_description || '').length)} / ۱۶۰</em>
                  </span>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.meta_description ?? ''}
                    onChange={(e) => setForm({ ...form, meta_description: e.target.value, _seoAppliedId: '' })}
                  />
                </label>

                <div className="full admin-image-block">
                  <span className="admin-image-block-label">تصاویر محصول</span>
                  <div className="admin-image-picker">
                    <div className="admin-image-gallery">
                      {normalizeImages(form.images).map((img) => (
                        <div key={img.id} className={`admin-image-tile${img.is_primary ? ' is-primary' : ''}`}>
                          <img src={imageUrl(img)} alt={img.alt || form.name || ''} />
                          {img.is_primary && <span className="admin-image-badge">اصلی</span>}
                          <button
                            type="button"
                            className="admin-image-tile-remove"
                            disabled={removingImageId === img.id || !form.id}
                            onClick={async () => {
                              if (!form.id) return;
                              if (!confirm('این تصویر حذف شود؟')) return;
                              setRemovingImageId(img.id);
                              try {
                                await api.adminDeleteProductImage(form.id, img.id);
                                setForm((f: any) => {
                                  if (!f) return f;
                                  const next = normalizeImages(f.images).filter((x) => x.id !== img.id);
                                  return {
                                    ...f,
                                    images: next,
                                    primary_image: next.find((x) => x.is_primary)?.image_url
                                      || next[0]?.image_url
                                      || null,
                                  };
                                });
                                toast('تصویر حذف شد');
                                qc.invalidateQueries({ queryKey: ['admin-products'] });
                              } catch (err: any) {
                                toast(formatApiError(err?.response?.data, err?.response?.status));
                              } finally {
                                setRemovingImageId(null);
                              }
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                      {pendingPreviews.map((src, idx) => (
                        <div key={`pending-${idx}`} className="admin-image-tile is-pending">
                          <img src={src} alt={`پیش‌نمایش ${idx + 1}`} />
                          <span className="admin-image-badge">جدید</span>
                          <button
                            type="button"
                            className="admin-image-tile-remove"
                            onClick={() => {
                              setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            برداشتن
                          </button>
                        </div>
                      ))}
                      {!normalizeImages(form.images).length && !pendingPreviews.length && (
                        <div className="admin-image-empty">هنوز تصویری نیست — فایل را بکشید یا انتخاب کنید</div>
                      )}
                    </div>

                    <div
                      className={`admin-image-dropzone${uploading ? ' is-busy' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
                        void ingestFiles(files);
                      }}
                      onClick={() => {
                        if (!uploading) fileInputRef.current?.click();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      <strong>{uploading ? 'در حال آپلود…' : 'افزودن تصویر محصول'}</strong>
                      <span>کلیک کنید یا تصویر را اینجا رها کنید · چند فایل مجاز است</span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="admin-image-file-input"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files || []);
                        e.target.value = '';
                        void ingestFiles(picked);
                      }}
                    />

                    <div className="admin-image-actions">
                      <button
                        type="button"
                        className="outline-btn"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? 'صبر کنید…' : 'انتخاب از سیستم'}
                      </button>
                      {!!normalizeImages(form.images).length && form.id && (
                        <button
                          type="button"
                          className="outline-btn admin-image-remove-btn"
                          disabled={uploading}
                          onClick={async () => {
                            if (!confirm('همه تصاویر این محصول حذف شوند؟')) return;
                            try {
                              await api.adminClearProductImages(form.id);
                              setForm((f: any) => (f ? { ...f, images: [], primary_image: null } : f));
                              setPendingFiles([]);
                              toast('همه تصاویر حذف شد');
                              qc.invalidateQueries({ queryKey: ['admin-products'] });
                            } catch (err: any) {
                              toast(formatApiError(err?.response?.data, err?.response?.status));
                            }
                          }}
                        >
                          حذف همه
                        </button>
                      )}
                    </div>
                    {!!pendingFiles.length && !form.id && (
                      <p className="admin-image-hint">
                        {pendingFiles.length} تصویر جدید بعد از ذخیرهٔ محصول آپلود می‌شود.
                      </p>
                    )}
                    {!!form.id && (
                      <p className="admin-image-hint">
                        برای محصول ذخیره‌شده، تصویر بلافاصله آپلود و در گالری دیده می‌شود.
                      </p>
                    )}
                  </div>
                </div>

                <label className="layout-toggle">
                  <input type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
                  ویژه / صفحه اصلی
                </label>
                <label className="layout-toggle">
                  <input type="checkbox" checked={form.is_active !== false} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  فعال در فروشگاه
                </label>
              </div>
              {formError && <div className="admin-form-error">{formError}</div>}
            </div>
            <div className="admin-edit-modal-foot">
              <button className="gold-btn" type="button" disabled={save.isPending || uploading} onClick={() => save.mutate()}>
                {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
              </button>
              <button className="outline-btn" type="button" onClick={closeForm}>انصراف / بستن</button>
            </div>
            </ModalErrorBoundary>
          </div>
        </div>,
        document.body,
      )}

      <div className="admin-card">
        {isLoading ? (
          <div className="admin-loading">…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>تصویر</th>
                  <th>نام</th>
                  <th>دسته</th>
                  <th>وزن</th>
                  <th>قیمت</th>
                  <th>موجودی</th>
                  <th>وضعیت</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      {productThumb(p) ? (
                        <img
                          src={productThumb(p)!}
                          alt=""
                          style={{ width: 40, height: 71, objectFit: 'cover', borderRadius: 8 }}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                      {p.is_featured && <div className="kpi-hint">ویژه</div>}
                    </td>
                    <td>{p.category_name}</td>
                    <td>{faNum(Number(p.weight_g))}</td>
                    <td className="money">{faPrice(p.price)}</td>
                    <td style={{ color: (p.stock ?? 0) <= 2 ? 'var(--down)' : undefined, fontWeight: 700 }}>
                      {faNum(p.stock ?? 0)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-badge ${p.is_active === false ? 'status-cancelled' : 'status-delivered'}`}
                        onClick={() => toggle.mutate({ id: p.id, body: { is_active: p.is_active === false } })}
                      >
                        {p.is_active === false ? 'غیرفعال' : 'فعال'}
                      </button>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="outline-btn"
                        style={{ padding: '6px 12px', fontSize: 12, marginLeft: 6 }}
                        disabled={openingId === p.id}
                        onClick={() => void openProductForm(p)}
                      >
                        {openingId === p.id ? '…' : 'ویرایش'}
                      </button>
                      <button
                        type="button"
                        className="outline-btn"
                        style={{ padding: '6px 12px', fontSize: 12, color: 'var(--down)' }}
                        onClick={() => {
                          if (confirm('حذف شود؟')) remove.mutate(p.id);
                        }}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
