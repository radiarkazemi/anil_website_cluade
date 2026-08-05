import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/endpoints';
import { faNum } from '../../utils/format';
import { useToast } from '../../store/toastStore';

export function AdminCategories() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.adminCategories().then((r) => r.data),
  });
  const [form, setForm] = useState<any>(null);

  const save = useMutation({
    mutationFn: () => form.id
      ? api.adminUpdateCategory(form.id, form)
      : api.adminCreateCategory(form),
    onSuccess: () => { toast('ذخیره شد'); setForm(null); qc.invalidateQueries({ queryKey: ['admin-categories'] }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.adminDeleteCategory(id),
    onSuccess: () => { toast('حذف شد'); qc.invalidateQueries({ queryKey: ['admin-categories'] }); },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="display" style={{ fontSize: 32 }}>دسته‌بندی‌ها</h1>
        <button className="gold-btn" type="button" onClick={() => setForm({ name: '', slug: '', order: data.length, display_count: 0, description: '' })}>+ دسته جدید</button>
      </div>
      {form && (
        <div className="admin-card" style={{ marginBottom: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input className="input" placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="اسلاگ" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="input" placeholder="ترتیب" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          <input className="input" placeholder="عدد نمایشی" value={form.display_count} onChange={(e) => setForm({ ...form, display_count: Number(e.target.value) })} />
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
            <button className="gold-btn" type="button" onClick={() => save.mutate()}>ذخیره</button>
            <button className="outline-btn" type="button" onClick={() => setForm(null)}>انصراف</button>
          </div>
        </div>
      )}
      <div className="admin-card">
        {isLoading ? '…' : (
          <table className="admin-table">
            <thead><tr><th>نام</th><th>اسلاگ</th><th>تعداد</th><th>ترتیب</th><th></th></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.slug}</td>
                  <td>{faNum(c.product_count)}</td>
                  <td>{faNum(c.order)}</td>
                  <td>
                    <button type="button" className="outline-btn" style={{ padding: '6px 12px', fontSize: 12, marginLeft: 6 }} onClick={() => setForm(c)}>ویرایش</button>
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
