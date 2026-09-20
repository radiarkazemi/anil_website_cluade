import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../../api/endpoints';
import { getSessionTokens } from '../../store/useStore';
import { faNum } from '../../utils/format';
import { BarSeries, KpiCard, PageHeader, SparkArea } from './adminShared';

const DEVICE_LABEL: Record<string, string> = {
  mobile: 'موبایل',
  desktop: 'دسکتاپ',
  tablet: 'تبلت',
  bot: 'ربات',
  unknown: 'نامشخص',
};

function faDayLabel(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function faTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AdminBlogAnalytics() {
  const [days, setDays] = useState(14);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applied, setApplied] = useState({ days: 14, from: '', to: '' });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-blog-traffic', applied],
    queryFn: () =>
      api
        .adminBlogTraffic({
          days: applied.days,
          from: applied.from || undefined,
          to: applied.to || undefined,
        })
        .then((r) => r.data),
    refetchInterval: 60_000,
  });

  const applyFilters = () => {
    setApplied({ days, from: dateFrom, to: dateTo });
  };

  const exportCsv = async () => {
    const tokens = getSessionTokens('admin');
    const path = api.adminTrafficExportUrl({
      days: applied.days,
      from: applied.from || undefined,
      to: applied.to || undefined,
      path: '/blog',
    });
    const res = await fetch(path, {
      headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {},
    });
    if (!res.ok) throw new Error('export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anil-blog-traffic.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const t = data?.totals;
  const eng = data?.engagement;
  const series = data?.series || [];
  const topPosts = (data?.top_posts || []).filter((p) => !p.is_list);
  const listRow = (data?.top_posts || []).find((p) => p.is_list);

  return (
    <div>
      <PageHeader
        title="تحلیل بلاگ"
        subtitle="بازدید نوشته‌ها، خواننده‌های یکتا، روند روزانه و منابع ورودی مجله آنیل"
        actions={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/panel/pages" className="outline-btn">مدیریت نوشته‌ها</Link>
            <Link to="/panel/analytics" className="outline-btn">ترافیک کل سایت</Link>
          </div>
        )}
      />

      <section className="admin-card" style={{ marginBottom: 18 }}>
        <div className="admin-card-head" style={{ alignItems: 'center' }}>
          <div>
            <h3>بازه زمانی</h3>
            <p>
              {data?.date_from && data?.date_to
                ? `${data.date_from} ← ${data.date_to}`
                : '۱۴ روز اخیر'}
              {isFetching ? ' · در حال همگام‌سازی…' : ''}
            </p>
          </div>
          <div className="admin-page-actions" style={{ gap: 8, flexWrap: 'wrap' }}>
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                className={days === d && !dateFrom && !dateTo ? 'gold-btn' : 'outline-btn'}
                onClick={() => {
                  setDays(d);
                  setDateFrom('');
                  setDateTo('');
                  setApplied({ days: d, from: '', to: '' });
                }}
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                {faNum(d)} روز
              </button>
            ))}
            <button type="button" className="outline-btn" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => refetch()}>
              تازه‌سازی
            </button>
            <button type="button" className="outline-btn" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => exportCsv().catch(() => {})}>
              خروجی CSV
            </button>
          </div>
        </div>

        <div className="admin-grid-2" style={{ marginTop: 8, gap: 12, alignItems: 'end' }}>
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
          <button type="button" className="gold-btn" style={{ padding: '10px 18px', justifySelf: 'start' }} onClick={applyFilters}>
            اعمال فیلتر
          </button>
        </div>
      </section>

      {isLoading && !data ? (
        <div className="admin-loading">در حال آماده‌سازی آمار بلاگ…</div>
      ) : !data?.available ? (
        <div className="admin-card empty-cell">
          سرویس آمار در دسترس نیست (MongoDB). پس از اتصال، بازدیدهای بلاگ اینجا نمایش داده می‌شود.
        </div>
      ) : (
        <>
          <div className="stat-grid analytics-kpi" style={{ marginBottom: 18 }}>
            <KpiCard label="بازدید امروز" value={faNum(t?.visits_today || 0)} tone="gold" hint="نمایش صفحه بلاگ" />
            <KpiCard label="خواننده یکتا امروز" value={faNum(t?.unique_today || 0)} tone="up" />
            <KpiCard label="بازدید بازه" value={faNum(t?.visits || 0)} hint="مجموع نمایش‌ها" />
            <KpiCard label="خواننده یکتا بازه" value={faNum(t?.unique_visitors || 0)} hint="بر اساس نشست" />
            <KpiCard label="بازدید نوشته‌ها" value={faNum(t?.article_views || 0)} hint="بدون صفحه فهرست" />
            <KpiCard label="بازدید فهرست بلاگ" value={faNum(t?.list_views || 0)} />
            <KpiCard
              label="میانگین بازدید / خواننده"
              value={faNum(t?.avg_views_per_visitor || 0)}
              hint={`${faNum(eng?.returning_rate || 0)}٪ بازگشتی`}
            />
            <KpiCard
              label="نوشته‌های منتشر"
              value={faNum(data.catalog?.published_posts || 0)}
              hint={`${faNum(t?.posts_viewed || 0)} نوشته در بازه دیده شده`}
              to="/panel/pages"
            />
          </div>

          <div className="admin-grid-2" style={{ marginBottom: 18 }}>
            <div className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h3>روند بازدید بلاگ</h3>
                  <p>نمایش روزانه صفحات مجله</p>
                </div>
                <div className="chart-total">{faNum(series.reduce((a, b) => a + b.visits, 0))}</div>
              </div>
              <SparkArea values={series.map((s) => s.visits)} />
              <BarSeries
                items={series.map((s) => ({
                  label: faDayLabel(s.date),
                  value: s.visits,
                }))}
              />
            </div>
            <div className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h3>خواننده‌های یکتا</h3>
                  <p>نشست‌های متمایز در هر روز</p>
                </div>
              </div>
              <SparkArea values={series.map((s) => s.unique_visitors)} color="var(--up)" />
              <BarSeries
                items={series.map((s) => ({
                  label: faDayLabel(s.date),
                  value: s.unique_visitors,
                }))}
              />
              <div className="stat-grid" style={{ marginTop: 16, gridTemplateColumns: '1fr 1fr 1fr' }}>
                <KpiCard label="جدید" value={faNum(eng?.new_visitors || 0)} />
                <KpiCard label="بازگشتی" value={faNum(eng?.returning_visitors || 0)} tone="gold" />
                <KpiCard label="نرخ بازگشت" value={`${faNum(eng?.returning_rate || 0)}٪`} />
              </div>
            </div>
          </div>

          <div className="admin-grid-2" style={{ marginBottom: 18 }}>
            <div className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h3>پربازدیدترین نوشته‌ها</h3>
                  <p>رتبه‌بندی بر اساس بازدید در بازه انتخاب‌شده</p>
                </div>
                {listRow && (
                  <div className="kpi-hint">فهرست /blog: {faNum(listRow.views)} بازدید</div>
                )}
              </div>
              <div className="top-products">
                {topPosts.map((p, i) => (
                  <div key={`${p.path}-${p.content_page_id || i}`} className="top-product blog-analytics-post">
                    <span className="rank">{faNum(i + 1)}</span>
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="" className="blog-analytics-thumb" />
                    ) : (
                      <span className="blog-analytics-thumb empty" />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="top-name">{p.title || p.path}</div>
                      <div className="kpi-hint" style={{ direction: 'ltr', textAlign: 'right' }}>
                        {p.share_code ? `goldanil.ir/b/${p.share_code}` : p.path}
                        {' · '}
                        {faNum(p.unique_visitors || 0)} خواننده یکتا
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div className="money">{faNum(p.views)}</div>
                      {p.slug && (
                        <Link to={`/blog/${p.slug}`} className="text-link" style={{ fontSize: 12 }} target="_blank" rel="noreferrer">
                          مشاهده
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {!topPosts.length && (
                  <div className="empty-cell">هنوز بازدیدی برای نوشته‌ها ثبت نشده — با انتشار و اشتراک لینک کوتاه پر می‌شود.</div>
                )}
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-head"><h3>منابع ورودی</h3></div>
              <div className="top-products" style={{ marginBottom: 18 }}>
                {(data.top_referrers || []).map((r, i) => (
                  <div key={`${r.host}-${i}`} className="top-product">
                    <span className="rank">{faNum(i + 1)}</span>
                    <div className="top-name" style={{ direction: 'ltr', textAlign: 'right' }}>
                      {r.host === 'direct' ? 'ورود مستقیم / ناشناس' : r.host}
                    </div>
                    <div className="money">{faNum(r.views)}</div>
                  </div>
                ))}
                {!(data.top_referrers || []).length && <div className="empty-cell">منبعی ثبت نشده.</div>}
              </div>
              <div className="admin-card-head"><h3>دستگاه‌ها</h3></div>
              <BarSeries
                items={(data.devices || []).map((d) => ({
                  label: DEVICE_LABEL[d.device] || d.device,
                  value: d.views,
                }))}
              />
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-head">
              <div>
                <h3>بازدیدهای اخیر بلاگ</h3>
                <p>۳۰ رویداد آخر — مسیر، دستگاه و منبع</p>
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>زمان</th>
                    <th>نوشته / مسیر</th>
                    <th>منبع</th>
                    <th>دستگاه</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recent || []).map((r, i) => (
                    <tr key={`${r.ts}-${i}`}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{faTime(r.ts)}</td>
                      <td>
                        <strong>{r.title || r.path || '—'}</strong>
                        <div className="kpi-hint" style={{ direction: 'ltr', textAlign: 'right' }}>{r.path}</div>
                      </td>
                      <td style={{ direction: 'ltr', textAlign: 'right', fontSize: 12 }}>
                        {r.referrer_host === 'direct' || !r.referrer_host ? 'مستقیم' : r.referrer_host}
                      </td>
                      <td>{DEVICE_LABEL[r.device || ''] || r.device || '—'}</td>
                    </tr>
                  ))}
                  {!(data.recent || []).length && (
                    <tr>
                      <td colSpan={4} className="empty-cell">رویدادی نیست.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
