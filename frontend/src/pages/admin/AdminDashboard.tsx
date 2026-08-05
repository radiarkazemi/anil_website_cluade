import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { faNum, faPrice } from '../../utils/format';

export function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => api.adminDashboard().then((r) => r.data) });

  if (isLoading || !data) return <div style={{ color: 'var(--text-dim)' }}>در حال بارگذاری…</div>;

  const stats = [
    { label: 'محصولات فعال', value: faNum(data.products_active) },
    { label: 'سفارش‌های امروز', value: faNum(data.orders_today) },
    { label: 'در انتظار پرداخت', value: faNum(data.orders_pending) },
    { label: 'فروش کل (تومان)', value: faPrice(data.revenue_total) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--gold-deep)', marginBottom: 6 }}>— گالری طلا آنیل</div>
          <h1 className="display" style={{ fontSize: 34 }}>داشبورد مدیریت</h1>
        </div>
        <div style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: 13 }}>
          نرخ ۱۸ عیار: <strong style={{ color: 'var(--gold-light)', fontSize: 18 }}>{faPrice(data.gold_price_18k)}</strong>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 18 }}>آخرین سفارش‌ها</h3>
            <Link to="/panel/orders" style={{ color: 'var(--gold-light)', fontSize: 13 }}>همه ←</Link>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>شماره</th><th>مشتری</th><th>مبلغ</th><th>وضعیت</th></tr>
            </thead>
            <tbody>
              {data.recent_orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>
                  <td>{o.full_name}</td>
                  <td>{faPrice(o.total)}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
              {data.recent_orders.length === 0 && (
                <tr><td colSpan={4} style={{ color: 'var(--text-dim)' }}>هنوز سفارشی ثبت نشده.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 18 }}>موجودی کم</h3>
            <Link to="/panel/products" style={{ color: 'var(--gold-light)', fontSize: 13 }}>محصولات ←</Link>
          </div>
          {data.low_stock.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{p.name}</span>
              <span style={{ color: 'var(--down)', fontWeight: 700 }}>{faNum((p as any).stock ?? 0)}</span>
            </div>
          ))}
          {data.low_stock.length === 0 && <div style={{ color: 'var(--text-dim)' }}>همه محصولات موجودی کافی دارند.</div>}
        </div>
      </div>
    </div>
  );
}
