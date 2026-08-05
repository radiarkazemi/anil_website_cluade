import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { faNum } from '../../utils/format';
import { useToast } from '../../store/toastStore';
import type { User } from '../../types';
import { PageHeader } from './adminShared';

const ROLES = [
  ['customer', 'مشتری'],
  ['staff', 'کارمند'],
  ['admin', 'مدیر'],
];

export function AdminUsers() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.adminUsers({ page_size: '200' }).then((r) => r.data.results),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<User> & { is_active?: boolean } }) =>
      api.adminUpdateUser(id, body),
    onSuccess: () => {
      toast('کاربر به‌روز شد');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: () => toast('خطا در به‌روزرسانی کاربر'),
  });

  const users = useMemo(() => {
    let list = data || [];
    if (role !== 'all') list = list.filter((u) => u.role === role);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((u) =>
        `${u.full_name} ${u.phone} ${u.email} ${u.city}`.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [data, q, role]);

  return (
    <div>
      <PageHeader
        title="مدیریت کاربران و نقش‌ها"
        subtitle={`${faNum(users.length)} کاربر · تغییر نقش و وضعیت فعال‌سازی`}
      />

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="جستجو نام / تلفن / ایمیل"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="filter-chips">
          <button type="button" className={`filter-chip${role === 'all' ? ' active' : ''}`} onClick={() => setRole('all')}>همه</button>
          {ROLES.map(([v, l]) => (
            <button key={v} type="button" className={`filter-chip${role === v ? ' active' : ''}`} onClick={() => setRole(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        {isLoading ? (
          <div className="admin-loading">…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>تلفن</th>
                  <th>نقش</th>
                  <th>وضعیت</th>
                  <th>شهر</th>
                  <th>عضویت</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.full_name || '—'}</strong>
                      <div className="kpi-hint">{u.email || 'بدون ایمیل'}</div>
                    </td>
                    <td dir="ltr">{u.phone}</td>
                    <td>
                      <select
                        className="input"
                        style={{ height: 36, minWidth: 120 }}
                        value={u.role}
                        onChange={(e) => patch.mutate({ id: u.id, body: { role: e.target.value } })}
                      >
                        {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-badge ${(u as User & { is_active?: boolean }).is_active === false ? 'status-cancelled' : 'status-delivered'}`}
                        onClick={() =>
                          patch.mutate({
                            id: u.id,
                            body: { is_active: (u as User & { is_active?: boolean }).is_active === false },
                          })
                        }
                      >
                        {(u as User & { is_active?: boolean }).is_active === false ? 'غیرفعال' : 'فعال'}
                      </button>
                    </td>
                    <td>{u.city || '—'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString('fa-IR')}</td>
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
