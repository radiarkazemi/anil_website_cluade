import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { faNum, faPrice } from '../../utils/format';
import { BarSeries, PageHeader, SparkArea } from './adminShared';

export function AdminAnalytics() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.adminDashboard().then((r) => r.data),
  });
  const { data: history } = useQuery({
    queryKey: ['price-history'],
    queryFn: () => api.priceHistory(40).then((r) => r.data as any),
  });

  if (isLoading || !dash) return <div className="admin-loading">در حال آماده‌سازی گزارش…</div>;

  const series = dash.revenue_series || [];
  const goldSeries = (dash.gold_history || []).map((g) => g.price_18k_per_gram);
  const histRows = Array.isArray(history) ? history : history?.results || history?.data || [];

  return (
    <div>
      <PageHeader
        title="تحلیل و هوش فروش"
        subtitle="نمای ترکیبی از فروش، نرخ طلا و اقلام پرفروش"
        actions={<Link to="/panel" className="outline-btn">بازگشت به داشبورد</Link>}
      />

      <div className="admin-grid-2">
        <div className="admin-card chart-card">
          <div className="admin-card-head">
            <div>
              <h3>فروش ۱۴ روز</h3>
              <p>روند درآمد فروشگاه</p>
            </div>
            <div className="chart-total">{faPrice(series.reduce((a, b) => a + b.revenue, 0))}</div>
          </div>
          <SparkArea values={series.map((s) => s.revenue)} />
        </div>
        <div className="admin-card chart-card">
          <div className="admin-card-head">
            <div>
              <h3>نوسان طلای ۱۸</h3>
              <p>بر اساس نرخ‌های ثبت‌شده در پنل</p>
            </div>
            <div className="chart-total">{faPrice(dash.gold_price_18k)}</div>
          </div>
          <SparkArea values={goldSeries.length ? goldSeries : [dash.gold_price_18k]} color="#37d391" />
        </div>
      </div>

      <div className="admin-grid-2" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <div className="admin-card-head"><h3>تعداد سفارش در روز</h3></div>
          <BarSeries items={series.map((s) => ({ label: s.label, value: s.orders }))} />
        </div>
        <div className="admin-card">
          <div className="admin-card-head"><h3>وضعیت پایپ‌لاین</h3></div>
          <BarSeries items={(dash.orders_by_status || []).map((s) => ({ label: s.label, value: s.count }))} />
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 18 }}>
        <div className="admin-card-head"><h3>رتبه‌بندی محصولات</h3></div>
        <div className="top-products">
          {(dash.top_products || []).map((p, i) => (
            <div key={p.product_name} className="top-product">
              <span className="rank">{faNum(i + 1)}</span>
              <div>
                <div className="top-name">{p.product_name}</div>
                <div className="kpi-hint">{faNum(p.qty)} فروش</div>
              </div>
              <div className="money">{faPrice(p.revenue)}</div>
            </div>
          ))}
          {(dash.top_products || []).length === 0 && <div className="empty-cell">داده‌ای نیست.</div>}
        </div>
      </div>

      {Array.isArray(histRows) && histRows.length > 0 && (
        <div className="admin-card" style={{ marginTop: 18 }}>
          <div className="admin-card-head"><h3>تاریخچه نرخ (Mongo / Analytics)</h3></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>زمان</th><th>۱۸ عیار</th><th>منبع</th></tr>
              </thead>
              <tbody>
                {histRows.slice(0, 15).map((row: any, idx: number) => (
                  <tr key={row.id || idx}>
                    <td>{row.created_at ? new Date(row.created_at).toLocaleString('fa-IR') : '—'}</td>
                    <td className="money">{faPrice(row.price_18k_per_gram || row.price || 0)}</td>
                    <td>{row.source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
