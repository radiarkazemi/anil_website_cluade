import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../../api/endpoints';
import { faNum, faPrice } from '../../utils/format';
import { useToast } from '../../store/toastStore';
import type { Product } from '../../types';
import { PageHeader } from './adminShared';

const empty = {
  name: '', slug: '', category: '', weight_g: '4', karat: 18, fee_ratio: '0.20',
  stone_value: 0, tag: '', description: '', stock: 5, is_active: true, is_featured: false,
};

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

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        weight_g: Number(form.weight_g),
        fee_ratio: Number(form.fee_ratio),
        stone_value: Number(form.stone_value),
        stock: Number(form.stock),
        karat: Number(form.karat),
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
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (e: any) => toast(e.response?.data?.detail || 'خطا در ذخیره'),
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

  return (
    <div>
      <PageHeader
        title="کاتالوگ محصولات"
        subtitle={`${faNum(products.length)} مورد · ویرایش سریع موجودی و ویژه‌سازی`}
        actions={
          <button
            className="gold-btn"
            type="button"
            onClick={() => setForm({ ...empty, category: categories?.[0]?.id || '' })}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input className="input" placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="اسلاگ" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input className="input" placeholder="وزن (گرم)" value={form.weight_g} onChange={(e) => setForm({ ...form, weight_g: e.target.value })} />
            <input className="input" placeholder="اجرت (مثلا 0.22)" value={form.fee_ratio} onChange={(e) => setForm({ ...form, fee_ratio: e.target.value })} />
            <input className="input" placeholder="سنگ" value={form.stone_value} onChange={(e) => setForm({ ...form, stone_value: e.target.value })} />
            <input className="input" placeholder="موجودی" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <select className="input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
              <option value="">بدون برچسب</option>
              <option value="پرفروش">پرفروش</option>
              <option value="جدید">جدید</option>
              <option value="ویژه">ویژه</option>
            </select>
            <textarea
              className="input"
              style={{ gridColumn: '1 / -1' }}
              placeholder="توضیحات"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={!!form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              />
              ویژه / پرفروش صفحه اصلی
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="gold-btn" type="button" disabled={save.isPending} onClick={() => save.mutate()}>ذخیره</button>
            <button className="outline-btn" type="button" onClick={() => setForm(null)}>انصراف</button>
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
                        onClick={() =>
                          setForm({
                            id: p.id,
                            name: p.name,
                            slug: p.slug,
                            category: p.category || categories?.find((c) => c.name === p.category_name)?.id,
                            weight_g: p.weight_g,
                            karat: p.karat,
                            fee_ratio: p.fee_ratio,
                            stone_value: p.stone_value,
                            tag: p.tag || '',
                            description: p.description || '',
                            stock: p.stock ?? 1,
                            is_active: p.is_active ?? true,
                            is_featured: p.is_featured,
                          })
                        }
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
