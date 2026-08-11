import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { faNum, faPrice } from '../../utils/format';
import { BarSeries, KpiCard, PageHeader, SparkArea, StatusBadge } from './adminShared';

export function AdminDashboard() {
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.adminDashboard().then((r) => r.data),
    refetchInterval: 45000,
  });

  if (isLoading || !data) {
    return <div className="admin-loading">در حال بارگذاری داشبورد…</div>;
  }

  const series = data.revenue_series || [];
  const revenues = series.map((s) => s.revenue);
  const statusBars = (data.orders_by_status || []).map((s) => ({
    label: s.label,
    value: s.count,
  }));

  return (
    <div className="admin-dashboard">
      <PageHeader
        title="مرکز فرمان فروشگاه"
        subtitle={`آخرین همگام‌سازی: ${new Date(dataUpdatedAt).toLocaleTimeString('fa-IR')}`}
        actions={
          <div className="admin-page-actions">
            <button type="button" className="outline-btn" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'در حال به‌روزرسانی…' : 'تازه‌سازی'}
            </button>
            <Link to="/panel/orders" className="gold-btn">مدیریت سفارش‌ها</Link>
          </div>
        }
      />

      <div className="stat-grid admin-kpi-grid">
        <KpiCard label="فروش امروز" value={faPrice(data.revenue_today)} hint="تومان" tone="gold" to="/panel/orders" />
        <KpiCard label="سفارش امروز" value={faNum(data.orders_today)} hint={`${faNum(data.orders_pending)} در انتظار`} to="/panel/orders" />
        <KpiCard label="میانگین سفارش" value={faPrice(data.avg_order_value || 0)} hint="تومان" />
        <KpiCard label="محصولات فعال" value={faNum(data.products_active)} hint={`از ${faNum(data.products_total)}`} to="/panel/products" />
        <KpiCard label="فروش کل" value={faPrice(data.revenue_total)} hint="بدون لغو شده‌ها" tone="up" />
        <KpiCard label="کاربران" value={faNum(data.users_total)} to="/panel/users" />
      </div>

      <div className="admin-grid-2">
        <div className="admin-card chart-card">
          <div className="admin-card-head">
            <div>
              <h3>روند ۱۴ روزه فروش</h3>
              <p>مجموع مبالغ سفارش‌های غیرلغو</p>
            </div>
            <div className="chart-total">{faPrice(revenues.reduce((a, b) => a + b, 0))}</div>
          </div>
          <SparkArea values={revenues.length ? revenues : [0]} />
          <div className="chart-x">
            {series.filter((_, i) => i % 2 === 0).map((s) => (
              <span key={s.date}>{s.label}</span>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <div>
              <h3>وضعیت سفارش‌ها</h3>
              <p>توزیع فعلی پایپ‌لاین فروش</p>
            </div>
          </div>
          <BarSeries items={statusBars} />
        </div>
      </div>

      <div className="admin-grid-3" style={{ marginTop: 18 }}>
        <div className="admin-card" style={{ gridColumn: 'span 2' }}>
          <div className="admin-card-head">
            <h3>آخرین سفارش‌ها</h3>
            <Link to="/panel/orders" className="text-link">همه سفارش‌ها</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>شماره</th>
                  <th>مشتری</th>
                  <th>مبلغ</th>
                  <th>وضعیت</th>
                  <th>زمان</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.order_number}</td>
                    <td>{o.full_name}</td>
                    <td className="money">{faPrice(o.total)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{new Date(o.created_at).toLocaleString('fa-IR')}</td>
                  </tr>
                ))}
                {data.recent_orders.length === 0 && (
                  <tr><td colSpan={5} className="empty-cell">هنوز سفارشی ثبت نشده.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-stack">
          <div className="admin-card gold-pulse-card">
            <div className="admin-card-head">
              <h3>نرخ طلای ۱۸</h3>
              <Link to="/panel/gold" className="text-link">مدیریت</Link>
            </div>
            <div className="gold-big">{faPrice(data.gold_price_18k)}</div>
            <div className="kpi-hint">
              {data.gold_updated_at
                ? `آخرین ثبت: ${new Date(data.gold_updated_at).toLocaleString('fa-IR')}`
                : 'نرخی ثبت نشده'}
            </div>
            {!!data.gold_history && data.gold_history.length > 1 && (
              <SparkArea
                values={data.gold_history.map((g) => g.price_18k_per_gram)}
                height={64}
              />
            )}
          </div>

          <div className="admin-card">
            <div className="admin-card-head">
              <h3>موجودی بحرانی</h3>
              <Link to="/panel/products" className="text-link">محصولات</Link>
            </div>
            {(data.low_stock || []).map((p) => (
              <div key={p.id} className="low-stock-row">
                <span>{p.name}</span>
                <strong>{faNum((p as { stock?: number }).stock ?? 0)}</strong>
              </div>
            ))}
            {(data.low_stock || []).length === 0 && (
              <div className="empty-cell">موجودی همه محصولات کافی است.</div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 18 }}>
        <div className="admin-card-head">
          <h3>پرفروش‌ترین اقلام</h3>
          <Link to="/panel/analytics" className="text-link">گزارش کامل</Link>
        </div>
        <div className="top-products">
          {(data.top_products || []).length === 0 && (
            <div className="empty-cell">هنوز داده‌ی فروشی برای رتبه‌بندی نیست.</div>
          )}
          {(data.top_products || []).map((p, i) => (
            <div key={p.product_name} className="top-product">
              <span className="rank">{faNum(i + 1)}</span>
              <div>
                <div className="top-name">{p.product_name}</div>
                <div className="kpi-hint">{faNum(p.qty)} عدد فروخته‌شده</div>
              </div>
              <div className="money">{faPrice(p.revenue)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-actions">
        <Link to="/panel/products" className="quick-action">+ محصول جدید</Link>
        <Link to="/panel/gold" className="quick-action">ثبت نرخ طلا</Link>
        <Link to="/panel/orders" className="quick-action">پیگیری سفارش‌ها</Link>
        <Link to="/panel/users" className="quick-action">مدیریت نقش‌ها</Link>
      </div>
    </div>
  );
}
