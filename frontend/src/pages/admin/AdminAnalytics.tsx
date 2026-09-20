import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../../api/endpoints';
import { getSessionTokens } from '../../store/useStore';
import { faNum, faPrice } from '../../utils/format';
import { BarSeries, KpiCard, PageHeader, SparkArea } from './adminShared';

const DEVICE_LABEL: Record<string, string> = {
  mobile: 'موبایل',
  desktop: 'دسکتاپ',
  tablet: 'تبلت',
  bot: 'ربات',
  unknown: 'نامشخص',
};

function faDateLabel(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function AdminAnalytics() {
  const [days, setDays] = useState(14);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [applied, setApplied] = useState({
    days: 14,
    from: '',
    to: '',
    path: '',
    product_id: '',
  });

  const { data: dash, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.adminDashboard().then((r) => r.data),
    refetchInterval: 45000,
  });
  const { data: traffic, isLoading: trafficLoading } = useQuery({
    queryKey: ['admin-traffic', applied],
    queryFn: () =>
      api
        .adminTraffic({
          days: applied.days,
          from: applied.from || undefined,
          to: applied.to || undefined,
          path: applied.path || undefined,
          product_id: applied.product_id || undefined,
        })
        .then((r) => r.data),
    refetchInterval: 60000,
  });
  const { data: history } = useQuery({
    queryKey: ['price-history'],
    queryFn: () => api.priceHistory(40).then((r) => r.data as any),
  });

  const applyFilters = () => {
    setApplied({
      days,
      from: dateFrom,
      to: dateTo,
      path: pathFilter.trim(),
      product_id: productFilter.trim(),
    });
  };

  const exportCsv = async () => {
    const tokens = getSessionTokens('admin');
    const path = api.adminTrafficExportUrl({
      days: applied.days,
      from: applied.from || undefined,
      to: applied.to || undefined,
      path: applied.path || undefined,
      product_id: applied.product_id || undefined,
    });
    const res = await fetch(path, {
      headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {},
    });
    if (!res.ok) throw new Error('export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anil-traffic.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !dash) return <div className="admin-loading">در حال آماده‌سازی گزارش…</div>;

  const series = dash.revenue_series || [];
  const goldSeries = (dash.gold_history || []).map((g) => g.price_18k_per_gram);
  const histRows = Array.isArray(history) ? history : history?.results || history?.data || [];
  const conv = dash.conversion || { orders_total: 0, paid_rate: 0, cancel_rate: 0 };
  const stock = dash.stock_health || { out_of_stock: 0, low_stock: 0, healthy: 0 };
  const t = traffic?.totals;
  const visitSeries = traffic?.series || [];

  return (
    <div>
      <PageHeader
        title="مرکز تحلیل پیشرفته"
        subtitle="بازدید سایت، ترافیک، فروش، موجودی و نرخ طلا — به‌روزرسانی خودکار"
        actions={<Link to="/panel/blog-analytics" className="outline-btn">تحلیل بلاگ</Link>}
      />

      <section className="admin-card" style={{ marginBottom: 18 }}>
        <div className="admin-card-head" style={{ alignItems: 'center' }}>
          <div>
            <h3>بازدید و ترافیک سایت</h3>
            <p>بازدیدکنندگان، صفحات پربازدید، منابع ورودی و دستگاه‌ها — برای مجله: <Link to="/panel/blog-analytics" className="text-link">داشبورد تحلیل بلاگ</Link></p>
          </div>
          <div className="admin-page-actions" style={{ gap: 8, flexWrap: 'wrap' }}>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                className={days === d && !dateFrom && !dateTo ? 'gold-btn' : 'outline-btn'}
                onClick={() => {
                  setDays(d);
                  setDateFrom('');
                  setDateTo('');
                  setApplied((a) => ({ ...a, days: d, from: '', to: '' }));
                }}
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                {faNum(d)} روز
              </button>
            ))}
            <button type="button" className="outline-btn" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => exportCsv().catch(() => {})}>
              خروجی CSV
            </button>
          </div>
        </div>

        <div className="admin-grid-2" style={{ marginTop: 8, gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="admin-field">
              <span>از تاریخ</span>
              <input className="input" type="date" dir="ltr" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="admin-field">
              <span>تا تاریخ</span>
              <input className="input" type="date" dir="ltr" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <label className="admin-field">
              <span>فیلتر مسیر</span>
              <input className="input" dir="ltr" placeholder="/products" value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} />
            </label>
            <label className="admin-field">
              <span>شناسه محصول</span>
              <input className="input" dir="ltr" placeholder="product uuid" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} />
            </label>
            <button type="button" className="gold-btn" style={{ padding: '10px 14px' }} onClick={applyFilters}>
              اعمال
            </button>
          </div>
        </div>

        {trafficLoading && !traffic ? (
          <div className="empty-cell">در حال بارگذاری ترافیک…</div>
        ) : !traffic?.available ? (
          <div className="empty-cell">
            سرویس آمار در دسترس نیست (MongoDB). پس از اتصال، بازدیدها اینجا نمایش داده می‌شوند.
          </div>
        ) : (
          <>
            <div className="stat-grid analytics-kpi" style={{ marginTop: 8 }}>
              <KpiCard label="بازدید امروز" value={faNum(t?.visits_today || 0)} tone="gold" hint="page views" />
              <KpiCard label="بازدیدکننده یکتا امروز" value={faNum(t?.unique_today || 0)} tone="up" />
              <KpiCard
                label={
                  applied.from || applied.to
                    ? 'بازدید بازه'
                    : `بازدید ${faNum(applied.days)} روز`
                }
                value={faNum(t?.visits || 0)}
                hint="مجموع نمایش صفحات"
              />
              <KpiCard
                label={
                  applied.from || applied.to
                    ? 'بازدیدکننده یکتا بازه'
                    : `بازدیدکننده یکتا ${faNum(applied.days)} روز`
                }
                value={faNum(t?.unique_visitors || 0)}
              />
              <KpiCard label="بازدید محصول" value={faNum(t?.product_views || 0)} hint="صفحات جزئیات کالا" />
            </div>

            <div className="admin-grid-2" style={{ marginTop: 18 }}>
              <div className="chart-card" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                <div className="admin-card-head">
                  <div>
                    <h3>روند بازدید</h3>
                    <p>تعداد نمایش صفحه در روز</p>
                  </div>
                  <div className="chart-total">{faNum(visitSeries.reduce((a, b) => a + b.visits, 0))}</div>
                </div>
                <SparkArea values={visitSeries.map((s) => s.visits)} />
                <BarSeries
                  items={visitSeries.map((s) => ({
                    label: faDateLabel(s.date),
                    value: s.visits,
                  }))}
                />
              </div>
              <div>
                <div className="admin-card-head"><h3>دستگاه‌ها</h3></div>
                <BarSeries
                  items={(traffic.devices || []).map((d) => ({
                    label: DEVICE_LABEL[d.device] || d.device,
                    value: d.views,
                  }))}
                />
                {(traffic.devices || []).length === 0 && (
                  <div className="empty-cell">هنوز دستگاهی ثبت نشده.</div>
                )}
              </div>
            </div>

            <div className="admin-grid-2" style={{ marginTop: 18 }}>
              <div>
                <div className="admin-card-head"><h3>صفحات پربازدید</h3></div>
                <div className="top-products">
                  {(traffic.top_pages || []).map((p, i) => (
                    <div key={p.path} className="top-product">
                      <span className="rank">{faNum(i + 1)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className="top-name" style={{ direction: 'ltr', textAlign: 'right' }}>{p.path}</div>
                        <div className="kpi-hint">{p.title || '—'}</div>
                      </div>
                      <div className="money">{faNum(p.views)}</div>
                    </div>
                  ))}
                  {(traffic.top_pages || []).length === 0 && (
                    <div className="empty-cell">هنوز بازدیدی ثبت نشده — با گشت‌وگذار در فروشگاه پر می‌شود.</div>
                  )}
                </div>
              </div>
              <div>
                <div className="admin-card-head"><h3>منابع ورودی (Referrer)</h3></div>
                <div className="top-products">
                  {(traffic.top_referrers || []).map((r, i) => (
                    <div key={`${r.host}-${i}`} className="top-product">
                      <span className="rank">{faNum(i + 1)}</span>
                      <div>
                        <div className="top-name" style={{ direction: 'ltr', textAlign: 'right' }}>
                          {r.host === 'direct' ? 'ورود مستقیم' : r.host}
                        </div>
                      </div>
                      <div className="money">{faNum(r.views)}</div>
                    </div>
                  ))}
                  {(traffic.top_referrers || []).length === 0 && (
                    <div className="empty-cell">منبع ورودی ثبت نشده.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-grid-2" style={{ marginTop: 18 }}>
              <div>
                <div className="admin-card-head"><h3>محصولات پربازدید</h3></div>
                <div className="top-products">
                  {(traffic.top_products || []).map((p, i) => (
                    <div key={p.product_id} className="top-product">
                      <span className="rank">{faNum(i + 1)}</span>
                      <div>
                        <div className="top-name">{p.name || p.product_id}</div>
                        <div className="kpi-hint">{p.slug ? `/${p.slug}` : 'محصول'}</div>
                      </div>
                      <div className="money">{faNum(p.views)}</div>
                    </div>
                  ))}
                  {(traffic.top_products || []).length === 0 && (
                    <div className="empty-cell">بازدید محصولی نیست.</div>
                  )}
                </div>
              </div>
              <div>
                <div className="admin-card-head"><h3>آخرین بازدیدها</h3></div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>زمان</th>
                        <th>مسیر</th>
                        <th>منبع</th>
                        <th>دستگاه</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(traffic.recent || []).map((row, idx) => (
                        <tr key={`${row.ts}-${idx}`}>
                          <td>{row.ts ? new Date(row.ts).toLocaleString('fa-IR') : '—'}</td>
                          <td style={{ direction: 'ltr', textAlign: 'right' }}>{row.path || '—'}</td>
                          <td style={{ direction: 'ltr', textAlign: 'right' }}>
                            {!row.referrer_host || row.referrer_host === 'direct'
                              ? 'مستقیم'
                              : row.referrer_host}
                          </td>
                          <td>{DEVICE_LABEL[row.device || ''] || row.device || '—'}</td>
                        </tr>
                      ))}
                      {(traffic.recent || []).length === 0 && (
                        <tr><td colSpan={4} className="empty-cell">بازدیی نیست.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

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
        <div className="admin-card-head"><h3>رتبه‌بندی محصولات (فروش)</h3></div>
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
