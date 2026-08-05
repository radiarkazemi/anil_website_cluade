import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { faPrice } from '../../utils/format';
import { useToast } from '../../store/toastStore';

const STATUSES = [
  ['pending', 'در انتظار پرداخت'],
  ['paid', 'پرداخت‌شده'],
  ['processing', 'در حال پردازش'],
  ['shipped', 'ارسال‌شده'],
  ['delivered', 'تحویل‌شده'],
  ['cancelled', 'لغوشده'],
];

export function AdminOrders() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.adminOrders({ page_size: '100' }).then((r) => r.data.results),
  });

  const update = useMutation({
    mutationFn: ({ num, status }: { num: string; status: string }) => api.adminUpdateOrder(num, { status } as any),
    onSuccess: () => { toast('وضعیت به‌روز شد'); qc.invalidateQueries({ queryKey: ['admin-orders'] }); },
  });

  return (
    <div>
      <h1 className="display" style={{ fontSize: 32, marginBottom: 22 }}>سفارش‌ها</h1>
      <div className="admin-card">
        {isLoading ? '…' : (
          <table className="admin-table">
            <thead>
              <tr><th>شماره</th><th>مشتری</th><th>تلفن</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th></tr>
            </thead>
            <tbody>
              {(data || []).map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700 }}>{o.order_number}</td>
                  <td>{o.full_name}</td>
                  <td dir="ltr">{o.phone}</td>
                  <td style={{ color: 'var(--gold-light)', fontWeight: 700 }}>{faPrice(o.total)}</td>
                  <td>
                    <select
                      className="input"
                      style={{ height: 36, minWidth: 140 }}
                      value={o.status}
                      onChange={(e) => update.mutate({ num: o.order_number, status: e.target.value })}
                    >
                      {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td>{new Date(o.created_at).toLocaleString('fa-IR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
