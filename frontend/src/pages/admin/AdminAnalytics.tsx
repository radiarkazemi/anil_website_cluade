import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { faNum, faPrice } from '../../utils/format';
import { BarSeries, KpiCard, PageHeader, SparkArea } from './adminShared';

export function AdminAnalytics() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.adminDashboard().then((r) => r.data),
    refetchInterval: 45000,
  });
  const { data: history } = useQuery({
    queryKey: ['price-history'],
    queryFn: () => api.priceHistory(40).then((r) => r.data as any),
  });

  if (isLoading || !dash) return <div className="admin-loading">در حال آماده‌سازی گزارش…</div>;

  const series = dash.revenue_series || [];
  const goldSeries = (dash.gold_history || []).map((g) => g.price_18k_per_gram);
  const histRows = Array.isArray(history) ? history : history?.results || history?.data || [];
  const conv = dash.conversion || { orders_total: 0, paid_rate: 0, cancel_rate: 0 };
  const stock = dash.stock_health || { out_of_stock: 0, low_stock: 0, healthy: 0 };

  return (
    <div>
      <PageHeader
        title="مرکز تحلیل پیشرفته"
        subtitle="فروش، پرداخت، موجودی، نرخ طلا و سلامت عملیات — به‌روزرسانی خودکار"
        actions={<Link to="/panel" className="outline-btn">داشبورد</Link>}
      />

      <div className="stat-grid analytics-kpi">
        <KpiCard label="درآمد کل" value={faPrice(dash.revenue_total)} tone="gold" hint="بدون سفارش‌های لغو شده" />
        <KpiCard label="درآمد پرداخت‌شده" value={faPrice(dash.revenue_paid || 0)} tone="up" />
        <KpiCard label="در انتظار پرداخت" value={faPrice(dash.pending_payment_value || 0)} tone="down" />
        <KpiCard label="میانگین سبد" value={faPrice(dash.avg_order_value || 0)} />
        <KpiCard label="نرخ پرداخت موفق" value={`${faNum(conv.paid_rate)}٪`} tone="up" />
        <KpiCard label="نرخ لغو" value={`${faNum(conv.cancel_rate)}٪`} tone="down" />
        <KpiCard label="سفارش امروز" value={faNum(dash.orders_today)} />
        <KpiCard label="طلای ۱۸" value={faPrice(dash.gold_price_18k)} tone="gold" />
      </div>

      <div className="admin-grid-2" style={{ marginTop: 18 }}>
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
              <p>نرخ‌های ثبت‌شده</p>
            </div>
            <div className="chart-total">{faPrice(dash.gold_price_18k)}</div>
          </div>
          <SparkArea values={goldSeries.length ? goldSeries : [dash.gold_price_18k]} color="#37d391" />
        </div>
      </div>

      <div className="admin-grid-2" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <div className="admin-card-head"><h3>تعداد سفارش روزانه</h3></div>
          <BarSeries items={series.map((s) => ({ label: s.label, value: s.orders }))} />
        </div>
        <div className="admin-card">
          <div className="admin-card-head"><h3>پایپ‌لاین وضعیت</h3></div>
          <BarSeries items={(dash.orders_by_status || []).map((s) => ({ label: s.label, value: s.count }))} />
        </div>
      </div>

      <div className="admin-grid-2" style={{ marginTop: 18 }}>
        <div className="admin-card">
          <div className="admin-card-head"><h3>سلامت موجودی</h3></div>
          <div className="stock-health">
            <div><b>{faNum(stock.healthy)}</b><span>سالم</span></div>
            <div className="warn"><b>{faNum(stock.low_stock)}</b><span>کم‌موجود</span></div>
            <div className="bad"><b>{faNum(stock.out_of_stock)}</b><span>ناموجود</span></div>
          </div>
          <BarSeries
            items={[
              { label: 'سالم', value: stock.healthy },
              { label: 'کم', value: stock.low_stock },
              { label: 'صفر', value: stock.out_of_stock },
            ]}
          />
        </div>
        <div className="admin-card">
          <div className="admin-card-head"><h3>ترکیب درگاه‌های پرداخت</h3></div>
          {(dash.payment_gateway_mix || []).length === 0 ? (
            <div className="empty-cell">هنوز پرداخت درگاهی ثبت نشده (sandbox را از گلد باکس تست کنید).</div>
          ) : (
            <div className="top-products">
              {(dash.payment_gateway_mix || []).map((g) => (
                <div key={g.payment_gateway} className="top-product">
                  <span className="rank">{g.payment_gateway}</span>
                  <div>
                    <div className="top-name">{faNum(g.c)} تراکنش</div>
                    <div className="kpi-hint">درگاه</div>
                  </div>
                  <div className="money">{faPrice(g.revenue || 0)}</div>
                </div>
              ))}
            </div>
          )}
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
          <div className="admin-card-head"><h3>تاریخچه نرخ (Analytics)</h3></div>
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
