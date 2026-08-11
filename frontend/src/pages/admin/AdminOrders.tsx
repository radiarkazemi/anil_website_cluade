import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { faNum, faPrice } from '../../utils/format';
import { useToast } from '../../store/toastStore';
import type { Order } from '../../types';
import { ORDER_STATUSES, PageHeader, StatusBadge } from './adminShared';

export function AdminOrders() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.adminOrders({ page_size: '200' }).then((r) => r.data.results),
  });

  const update = useMutation({
    mutationFn: ({ num, status }: { num: string; status: string }) =>
      api.adminUpdateOrder(num, { status } as Partial<Order>),
    onSuccess: (r) => {
      toast('وضعیت سفارش به‌روز شد');
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setSelected(r.data);
    },
  });

  const orders = useMemo(() => {
    let list = data || [];
    if (status !== 'all') list = list.filter((o) => o.status === status);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((o) =>
        `${o.order_number} ${o.full_name} ${o.phone} ${o.city}`.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [data, q, status]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: (data || []).length };
    for (const [key] of ORDER_STATUSES) map[key] = 0;
    for (const o of data || []) map[o.status] = (map[o.status] || 0) + 1;
    return map;
  }, [data]);

  return (
    <div>
      <PageHeader
        title="مرکز سفارش‌ها"
        subtitle={`${faNum(orders.length)} سفارش در فیلتر فعلی`}
      />

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="جستجو: شماره، نام، تلفن…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="filter-chips">
          <button type="button" className={`filter-chip${status === 'all' ? ' active' : ''}`} onClick={() => setStatus('all')}>
            همه ({faNum(counts.all || 0)})
          </button>
          {ORDER_STATUSES.map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={`filter-chip${status === v ? ' active' : ''}`}
              onClick={() => setStatus(v)}
            >
              {l} ({faNum(counts[v] || 0)})
            </button>
          ))}
        </div>
      </div>

      <div className={`admin-split${selected ? ' open' : ''}`}>
        <div className="admin-card">
          {isLoading ? (
            <div className="admin-loading">…</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>شماره</th>
                    <th>مشتری</th>
                    <th>تلفن</th>
                    <th>مبلغ</th>
                    <th>وضعیت</th>
                    <th>تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className={selected?.id === o.id ? 'row-active' : ''}
                      onClick={() => setSelected(o)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="mono">{o.order_number}</td>
                      <td>{o.full_name}</td>
                      <td dir="ltr">{o.phone}</td>
                      <td className="money">{faPrice(o.total)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td>{new Date(o.created_at).toLocaleString('fa-IR')}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={6} className="empty-cell">سفارشی یافت نشد.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <aside className="admin-card order-drawer">
            <div className="admin-card-head">
              <div>
                <h3>{selected.order_number}</h3>
                <StatusBadge status={selected.status} />
              </div>
              <button type="button" className="icon-btn" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="drawer-block">
              <div className="drawer-label">مشتری</div>
              <div>{selected.full_name}</div>
              <div dir="ltr" className="kpi-hint">{selected.phone}</div>
              <div className="kpi-hint">{selected.city || '—'} · {selected.address}</div>
            </div>

            <div className="drawer-block">
              <div className="drawer-label">مبالغ</div>
              <div className="drawer-kv"><span>جمع جزء</span><strong>{faPrice(selected.subtotal)}</strong></div>
              <div className="drawer-kv"><span>ارسال</span><strong>{faPrice(selected.shipping_cost)}</strong></div>
              <div className="drawer-kv"><span>تخفیف</span><strong>{faPrice(selected.discount)}</strong></div>
              <div className="drawer-kv total"><span>مبلغ نهایی</span><strong>{faPrice(selected.total)}</strong></div>
              <div className="kpi-hint">نرخ طلای فاکتور: {faPrice(selected.gold_price_snapshot)}</div>
            </div>

            <div className="drawer-block">
              <div className="drawer-label">اقلام</div>
              {(selected.items || []).map((it) => (
                <div key={it.id} className="drawer-kv">
                  <span>{it.product_name} × {faNum(it.qty)}</span>
                  <strong>{faPrice(it.line_total)}</strong>
                </div>
              ))}
            </div>

            <div className="drawer-block">
              <div className="drawer-label">تغییر وضعیت</div>
              <select
                className="input"
                value={selected.status}
                onChange={(e) => update.mutate({ num: selected.order_number, status: e.target.value })}
              >
                {ORDER_STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {selected.note && (
              <div className="drawer-block">
                <div className="drawer-label">یادداشت</div>
                <p>{selected.note}</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
