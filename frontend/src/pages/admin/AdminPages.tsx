import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/endpoints';
import { useToast } from '../../store/toastStore';
import { PageHeader } from './adminShared';
import type { ContentPage } from '../../types';

type FormState = Partial<ContentPage>;

const empty: FormState = {
  title: '',
  slug: '',
  page_type: 'page',
  excerpt: '',
  body: '',
  is_published: true,
  show_in_nav: true,
  order: 0,
};

function unwrapList(data: unknown): ContentPage[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data) {
    return (data as { results: ContentPage[] }).results;
  }
  return [];
}

export function AdminPages() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: () => api.adminPages().then((r) => unwrapList(r.data)),
  });
  const [form, setForm] = useState<FormState | null>(null);
  const pages = data ?? [];

  const save = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('no form');
      const payload = {
        title: form.title,
        slug: form.slug,
        page_type: form.page_type,
        excerpt: form.excerpt || '',
        body: form.body || '',
        is_published: form.is_published !== false,
        show_in_nav: !!form.show_in_nav,
        order: Number(form.order || 0),
      };
      return form.id
        ? api.adminUpdatePage(form.id, payload)
        : api.adminCreatePage(payload);
    },
    onSuccess: () => {
      toast('صفحه ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-pages'] });
      qc.invalidateQueries({ queryKey: ['nav-pages'] });
      qc.invalidateQueries({ queryKey: ['blog-pages'] });
    },
    onError: () => toast('خطا در ذخیره صفحه'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.adminDeletePage(id),
    onSuccess: () => {
      toast('حذف شد');
      qc.invalidateQueries({ queryKey: ['admin-pages'] });
      qc.invalidateQueries({ queryKey: ['nav-pages'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="صفحات و بلاگ"
        subtitle="راهنمای خرید، بلاگ و صفحات محتوایی — قابل نمایش در منوی بالای سایت"
        actions={(
          <button type="button" className="gold-btn" onClick={() => setForm({ ...empty, order: pages.length + 1 })}>
            + صفحه جدید
          </button>
        )}
      />

      {form && (
        <div className="admin-card" style={{ marginBottom: 18 }}>
          <div className="form-grid">
            <label>
              <span>عنوان</span>
              <input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              <span>اسلاگ</span>
              <input className="input" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </label>
            <label>
              <span>نوع</span>
              <select
                className="input"
                value={form.page_type || 'page'}
                onChange={(e) => setForm({ ...form, page_type: e.target.value as 'page' | 'blog' })}
              >
                <option value="page">صفحه</option>
                <option value="blog">بلاگ</option>
              </select>
            </label>
            <label>
              <span>ترتیب</span>
              <input
                className="input"
                type="number"
                value={form.order ?? 0}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              />
            </label>
            <label className="full">
              <span>خلاصه</span>
              <input className="input" value={form.excerpt || ''} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            </label>
            <label className="full">
              <span>متن (هر پاراگراف در یک خط)</span>
              <textarea className="input" rows={8} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </label>
            <label className="layout-toggle">
              <input
                type="checkbox"
                checked={form.is_published !== false}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              منتشر شده
            </label>
            <label className="layout-toggle">
              <input
                type="checkbox"
                checked={!!form.show_in_nav}
                onChange={(e) => setForm({ ...form, show_in_nav: e.target.checked })}
              />
              نمایش در منو
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" className="gold-btn" onClick={() => save.mutate()}>ذخیره</button>
            <button type="button" className="outline-btn" onClick={() => setForm(null)}>انصراف</button>
          </div>
        </div>
      )}

      <div className="admin-card">
        {isLoading ? '…' : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>عنوان</th>
                <th>نوع</th>
                <th>اسلاگ</th>
                <th>منو</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.page_type === 'blog' ? 'بلاگ' : 'صفحه'}</td>
                  <td>{p.slug}</td>
                  <td>{p.show_in_nav ? 'بله' : '—'}</td>
                  <td>{p.is_published === false ? 'پیش‌نویس' : 'منتشر'}</td>
                  <td>
                    <button type="button" className="outline-btn" style={{ padding: '6px 12px', fontSize: 12, marginLeft: 6 }} onClick={() => setForm(p)}>ویرایش</button>
                    <button type="button" className="outline-btn" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--down)' }} onClick={() => remove.mutate(p.id)}>حذف</button>
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
