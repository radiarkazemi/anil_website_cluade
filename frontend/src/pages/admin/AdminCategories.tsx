import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/endpoints';
import { faNum } from '../../utils/format';
import { useToast } from '../../store/toastStore';
import type { Category } from '../../types';

type FormState = Partial<Category> & { id?: string };

export function AdminCategories() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.adminCategories().then((r) => r.data),
  });
  const [form, setForm] = useState<FormState | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error('no form');
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || '',
        order: Number(form.order || 0),
        display_count: Number(form.display_count || 0),
        is_active: form.is_active !== false,
      };
      const res = form.id
        ? await api.adminUpdateCategory(form.id, payload)
        : await api.adminCreateCategory(payload);
      const cat = res.data;
      if (imageFile && cat.id) {
        await api.adminUploadCategoryImage(cat.id, imageFile);
      }
      return cat;
    },
    onSuccess: () => {
      toast('ذخیره شد');
      setForm(null);
      setImageFile(null);
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => toast('خطا در ذخیره دسته'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.adminDeleteCategory(id),
    onSuccess: () => {
      toast('حذف شد');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const openEdit = (c: Category) => {
    setImageFile(null);
    setForm({ ...c });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 className="display" style={{ fontSize: 32 }}>دسته‌بندی‌ها</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 6 }}>
            افزودن، ویرایش، حذف و تصویر واقعی برای هر دسته
          </p>
        </div>
        <button
          className="gold-btn"
          type="button"
          onClick={() => {
            setImageFile(null);
            setForm({
              name: '',
              slug: '',
              order: data.length,
              display_count: 0,
              description: '',
              is_active: true,
            });
          }}
        >
          + دسته جدید
        </button>
      </div>

      {form && (
        <div className="admin-card" style={{ marginBottom: 18 }}>
          <div className="form-grid">
            <label>
              <span>نام</span>
              <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              <span>اسلاگ</span>
              <input className="input" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </label>
            <label>
              <span>ترتیب</span>
              <input className="input" type="number" value={form.order ?? 0} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
            </label>
            <label>
              <span>عدد نمایشی</span>
              <input className="input" type="number" value={form.display_count ?? 0} onChange={(e) => setForm({ ...form, display_count: Number(e.target.value) })} />
            </label>
            <label className="full">
              <span>توضیح</span>
              <input className="input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="layout-toggle">
              <input
                type="checkbox"
                checked={form.is_active !== false}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              فعال
            </label>
            <label className="full">
              <span>تصویر دسته</span>
              <div className="cat-admin-preview">
                {(imageFile || form.image_url) && (
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : form.image_url!}
                    alt=""
                  />
                )}
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </div>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="gold-btn" type="button" onClick={() => save.mutate()}>ذخیره</button>
            <button className="outline-btn" type="button" onClick={() => { setForm(null); setImageFile(null); }}>انصراف</button>
          </div>
        </div>
      )}

      <div className="admin-card">
        {isLoading ? '…' : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>تصویر</th>
                <th>نام</th>
                <th>اسلاگ</th>
                <th>تعداد</th>
                <th>ترتیب</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.image_url ? (
                      <img className="cat-table-thumb" src={c.image_url} alt="" />
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    )}
                  </td>
                  <td>{c.name}</td>
                  <td>{c.slug}</td>
                  <td>{faNum(c.product_count)}</td>
                  <td>{faNum(c.order)}</td>
                  <td>{c.is_active === false ? 'غیرفعال' : 'فعال'}</td>
                  <td>
                    <button type="button" className="outline-btn" style={{ padding: '6px 12px', fontSize: 12, marginLeft: 6 }} onClick={() => openEdit(c)}>ویرایش</button>
                    <button type="button" className="outline-btn" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--down)' }} onClick={() => remove.mutate(c.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
