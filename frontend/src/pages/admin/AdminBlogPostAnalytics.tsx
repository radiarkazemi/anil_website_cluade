import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/endpoints';
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

export function AdminBlogPostAnalytics() {
  const { pageId = '' } = useParams<{ pageId: string }>();
  const [searchParams] = useSearchParams();

  const initialDays = Number(searchParams.get('days') || 14) || 14;
  const initialFrom = searchParams.get('from') || '';
  const initialTo = searchParams.get('to') || '';

  const [days, setDays] = useState(initialDays);
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);
  const [applied, setApplied] = useState({
    days: initialDays,
    from: initialFrom,
    to: initialTo,
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['admin-blog-post-traffic', pageId, applied],
    queryFn: () =>
      api
        .adminBlogPostTraffic(pageId, {
          days: applied.days,
          from: applied.from || undefined,
          to: applied.to || undefined,
        })
        .then((r) => r.data),
    enabled: Boolean(pageId),
    refetchInterval: 60_000,
  });

  const backQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (applied.from || applied.to) {
      if (applied.from) q.set('from', applied.from);
      if (applied.to) q.set('to', applied.to);
    } else {
      q.set('days', String(applied.days));
    }
    const s = q.toString();
    return s ? `?${s}` : '';
  }, [applied]);

  const t = data?.totals;
  const eng = data?.engagement;
  const series = data?.series || [];
  const post = data?.post;
  const hourly = data?.hourly || [];

  return (
    <div className="blog-post-analytics">
      <PageHeader
        title={post?.title || 'آمار نوشته'}
        subtitle="آمار اختصاصی همین نوشته"
        actions={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to={`/panel/blog-analytics${backQuery}`} className="outline-btn">
              ← همه نوشته‌ها
            </Link>
            {post?.slug && (
              <Link to={`/blog/${post.slug}`} className="outline-btn" target="_blank" rel="noreferrer">
                مشاهده در سایت
              </Link>
            )}
          </div>
        )}
      />

      {post && (
        <section className="blog-post-analytics-hero">
          {post.cover_url ? (
            <img src={post.cover_url} alt="" className="blog-post-analytics-cover" />
          ) : (
            <span className="blog-post-analytics-cover empty" />
          )}
          <div className="blog-post-analytics-hero-copy">
            <span className="kpi-hint">
              {post.is_published ? 'منتشر شده' : 'پیش‌نویس'}
              {post.share_path ? ` · goldanil.ir${post.share_path}` : ''}
            </span>
            {post.excerpt ? <p>{post.excerpt}</p> : null}
          </div>
        </section>
      )}

      <section className="blog-analytics-toolbar">
        <div className="blog-analytics-days">
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
            >
              {faNum(d)} روز
            </button>
          ))}
        </div>
        <div className="blog-analytics-range">
          <input className="input" type="date" dir="ltr" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="از تاریخ" />
          <span className="kpi-hint">تا</span>
          <input className="input" type="date" dir="ltr" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="تا تاریخ" />
          <button
            type="button"
            className="gold-btn"
            onClick={() => setApplied({ days, from: dateFrom, to: dateTo })}
          >
            اعمال
          </button>
          <button type="button" className="outline-btn" onClick={() => refetch()}>تازه‌سازی</button>
        </div>
        <p className="blog-analytics-window kpi-hint">
          {data?.date_from && data?.date_to ? `${data.date_from} ← ${data.date_to}` : '۱۴ روز اخیر'}
          {isFetching ? ' · همگام‌سازی…' : ''}
        </p>
      </section>

      {isLoading && !data ? (
        <div className="admin-loading">در حال آماده‌سازی آمار نوشته…</div>
      ) : isError ? (
        <div className="admin-card empty-cell">نوشته یافت نشد یا دسترسی ندارید.</div>
      ) : !data?.available ? (
        <div className="admin-card empty-cell">
          سرویس آمار در دسترس نیست (MongoDB). پس از اتصال، بازدید این نوشته اینجا نمایش داده می‌شود.
        </div>
      ) : (
        <>
          <div className="stat-grid blog-analytics-kpis">
            <KpiCard label="بازدید بازه" value={faNum(t?.visits || 0)} tone="gold" />
            <KpiCard label="خواننده یکتا" value={faNum(t?.unique_visitors || 0)} />
            <KpiCard label="بازدید امروز" value={faNum(t?.visits_today || 0)} />
            <KpiCard
              label="نرخ بازگشت"
              value={`${faNum(eng?.returning_rate || 0)}٪`}
              hint={`${faNum(eng?.returning_visitors || 0)} بازگشتی`}
            />
          </div>

          <div className="stat-grid blog-analytics-kpis blog-analytics-kpis-secondary">
            <KpiCard label="لینک کوتاه /b/" value={faNum(t?.share_link_views || 0)} />
            <KpiCard label="مسیر /blog/…" value={faNum(t?.slug_path_views || 0)} />
            <KpiCard label="میانگین / خواننده" value={faNum(t?.avg_views_per_visitor || 0)} />
            <KpiCard label="خواننده یکتا امروز" value={faNum(t?.unique_today || 0)} />
          </div>

          <section className="admin-card" style={{ marginBottom: 18 }}>
            <div className="admin-card-head">
              <div>
                <h3>روند بازدید</h3>
                <p>نمایش روزانه همین نوشته</p>
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
          </section>

          <div className="admin-grid-2" style={{ marginBottom: 18 }}>
            <section className="admin-card">
              <div className="admin-card-head"><h3>منابع ورودی</h3></div>
              <div className="top-products">
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
            </section>
            <section className="admin-card">
              <div className="admin-card-head"><h3>دستگاه‌ها</h3></div>
              <BarSeries
                items={(data.devices || []).map((d) => ({
                  label: DEVICE_LABEL[d.device] || d.device,
                  value: d.views,
                }))}
              />
              <div className="admin-card-head" style={{ marginTop: 18 }}><h3>توزیع ساعتی (UTC)</h3></div>
              <BarSeries
                items={hourly.filter((h) => h.views > 0).map((h) => ({
                  label: faNum(h.hour),
                  value: h.views,
                }))}
              />
            </section>
          </div>

          <div className="admin-grid-2" style={{ marginBottom: 18 }}>
            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h3>مسیرهای ورود</h3>
                  <p>اسلاگ و لینک کوتاه</p>
                </div>
              </div>
              <div className="top-products">
                {(data.paths || []).map((p, i) => (
                  <div key={`${p.path}-${i}`} className="top-product">
                    <span className="rank">{faNum(i + 1)}</span>
                    <div className="top-name" style={{ direction: 'ltr', textAlign: 'right' }}>{p.path}</div>
                    <div className="money">{faNum(p.views)}</div>
                  </div>
                ))}
                {!(data.paths || []).length && <div className="empty-cell">مسیری ثبت نشده.</div>}
              </div>
            </section>
            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h3>بازدیدهای اخیر</h3>
                  <p>آخرین رویدادها</p>
                </div>
              </div>
              <div className="admin-table-wrap blog-post-analytics-recent">
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
                    {(data.recent || []).slice(0, 12).map((r, i) => (
                      <tr key={`${r.ts}-${i}`}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{faTime(r.ts)}</td>
                        <td>
                          <div className="kpi-hint" style={{ direction: 'ltr', textAlign: 'right' }}>{r.path || '—'}</div>
                        </td>
                        <td style={{ direction: 'ltr', textAlign: 'right', fontSize: 12 }}>
                          {r.referrer_host === 'direct' || !r.referrer_host ? 'مستقیم' : r.referrer_host}
                        </td>
                        <td>{DEVICE_LABEL[r.device || ''] || r.device || '—'}</td>
                      </tr>
                    ))}
                    {!(data.recent || []).length && (
                      <tr>
                        <td colSpan={4} className="empty-cell">رویدادی برای این نوشته نیست.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
