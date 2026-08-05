import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/endpoints';

export function AdminUsers() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.adminUsers({ page_size: '100' }).then((r) => r.data.results),
  });

  return (
    <div>
      <h1 className="display" style={{ fontSize: 32, marginBottom: 22 }}>کاربران</h1>
      <div className="admin-card">
        {isLoading ? '…' : (
          <table className="admin-table">
            <thead>
              <tr><th>نام</th><th>تلفن</th><th>نقش</th><th>شهر</th><th>عضویت</th></tr>
            </thead>
            <tbody>
              {(data || []).map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name || '—'}</td>
                  <td dir="ltr">{u.phone}</td>
                  <td>{u.role}</td>
                  <td>{u.city || '—'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString('fa-IR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
