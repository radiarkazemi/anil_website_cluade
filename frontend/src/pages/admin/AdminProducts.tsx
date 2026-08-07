import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../../api/endpoints';
import { faNum, faPrice } from '../../utils/format';
import { bestProductSeo, suggestProductSeo, type SeoSuggestion } from '../../utils/productSeo';
import { useToast } from '../../store/toastStore';
import type { Product } from '../../types';
import { PageHeader } from './adminShared';

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

function formatApiError(data: unknown): string {
  if (!data) return 'خطا در ذخیره';
  if (typeof data === 'string') return data;
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
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      setFormError('');
      if (!String(form?.name || '').trim()) {
        throw { response: { data: { name: ['نام محصول الزامی است.'] } } };
      }
      if (!form?.category) {
        throw { response: { data: { category: ['دسته‌بندی را انتخاب کنید.'] } } };
      }

      const weight = parseNumber(form.weight_g, NaN);
      if (!Number.isFinite(weight) || weight <= 0) {
        throw { response: { data: { weight_g: ['وزن معتبر وارد کنید.'] } } };
      }

      const autoSlug = slugifyName(form.name);
      const categoryName = categories?.find((c) => c.id === form.category)?.name || '';
      const seoFallback = bestProductSeo({
        name: form.name,
        categoryName,
        weight_g: weight,
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
      if (file) await api.adminUploadImage(product.id, file, true);
      return product;
    },
    onSuccess: () => {
      toast('محصول ذخیره شد');
      setForm(null);
      setFile(null);
      setFormError('');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (e: any) => {
      const msg = formatApiError(e?.response?.data);
      setFormError(msg);
      toast(msg);
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

  return (
    <div>
      <PageHeader
        title="کاتالوگ محصولات"
        subtitle={`${faNum(products.length)} مورد · ویرایش سریع موجودی و ویژه‌سازی`}
        actions={
          <button
            className="gold-btn"
            type="button"
            onClick={() => {
              setFormError('');
              setFile(null);
              setForm({ ...empty, category: categories?.[0]?.id || '' });
            }}
          >
            + محصول جدید
          </button>
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

      {form && (
        <div className="admin-card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>{form.id ? 'ویرایش محصول' : 'محصول جدید'}</h3>
          <div className="form-grid product-form-grid">
            <label>
              <span>نام محصول *</span>
              <input className="input" value={form.name} onChange={(e) => onNameChange(e.target.value)} />
            </label>
            <label>
              <span>اسلاگ (اختیاری — خودکار از نام)</span>
              <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" />
            </label>
            <label>
              <span>دسته‌بندی *</span>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">انتخاب دسته</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>کد کالا (SKU)</span>
              <input className="input" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </label>
            <label>
              <span>وزن (گرم) *</span>
              <input className="input" value={form.weight_g} onChange={(e) => setForm({ ...form, weight_g: e.target.value })} />
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
              <input className="input" value={form.fee_ratio} onChange={(e) => setForm({ ...form, fee_ratio: e.target.value })} />
            </label>
            <label>
              <span>ارزش سنگ / نگین (تومان)</span>
              <input className="input" value={form.stone_value} onChange={(e) => setForm({ ...form, stone_value: e.target.value })} />
            </label>
            <label>
              <span>موجودی</span>
              <input className="input" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </label>
            <label>
              <span>برچسب</span>
              <select className="input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
                <option value="">بدون برچسب</option>
                <option value="پرفروش">پرفروش</option>
                <option value="جدید">جدید</option>
                <option value="ویژه">ویژه</option>
              </select>
            </label>
            <label>
              <span>برچسب جایگزین تصویر</span>
              <input className="input" value={form.placeholder_label || ''} onChange={(e) => setForm({ ...form, placeholder_label: e.target.value })} />
            </label>
            <label className="full">
              <span>توضیحات کامل</span>
              <textarea className="input" rows={4} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                        {s.keywords.slice(0, 4).map((k) => (
                          <span key={k}>{k}</span>
                        ))}
                      </div>
                      <div className="seo-suggest-tip">{s.tips[0]}</div>
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
              <input className="input" value={form.meta_title || ''} onChange={(e) => setForm({ ...form, meta_title: e.target.value, _seoAppliedId: '' })} />
            </label>
            <label className="full">
              <span>
                توضیح سئو (meta description)
                <em className="seo-count">{faNum((form.meta_description || '').length)} / ۱۶۰</em>
              </span>
              <textarea
                className="input"
                rows={3}
                value={form.meta_description || ''}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value, _seoAppliedId: '' })}
              />
            </label>
            <label className="full">
              <span>تصویر اصلی</span>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
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
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="gold-btn" type="button" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
            </button>
            <button className="outline-btn" type="button" onClick={() => { setForm(null); setFormError(''); }}>انصراف</button>
          </div>
        </div>
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
                      {p.images?.[0]?.image || p.primary_image ? (
                        <img
                          src={p.images?.[0]?.image || p.primary_image}
                          alt=""
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
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
                        onClick={() => {
                          setFormError('');
                          setFile(null);
                          setForm({
                            id: p.id,
                            name: p.name,
                            slug: p.slug,
                            category: p.category || categories?.find((c) => c.name === p.category_name)?.id,
                            weight_g: p.weight_g,
                            karat: p.karat ?? 18,
                            fee_ratio: p.fee_ratio,
                            stone_value: p.stone_value,
                            tag: p.tag || '',
                            description: p.description || '',
                            placeholder_label: p.placeholder_label || '',
                            sku: p.sku || '',
                            stock: p.stock ?? 1,
                            is_active: p.is_active ?? true,
                            is_featured: p.is_featured,
                            meta_title: p.meta_title || '',
                            meta_description: p.meta_description || '',
                          });
                        }}
                      >
                        ویرایش
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
