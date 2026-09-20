import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
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

function faHour(h: number) {
  return `${faNum(h)}:۰۰`;
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

  const applyFilters = () => {
    setApplied({ days, from: dateFrom, to: dateTo });
  };

  const t = data?.totals;
  const eng = data?.engagement;
  const series = data?.series || [];
  const post = data?.post;
  const hourly = data?.hourly || [];
  const peakHour = hourly.reduce(
    (best, row) => (row.views > (best?.views || 0) ? row : best),
    null as { hour: number; views: number } | null,
  );

  return (
    <div>
      <PageHeader
        title={post?.title || 'تحلیل نوشته'}
        subtitle="بازدید، خواننده‌های یکتا، منابع ورودی و مسیرهای ورود این نوشته"
        actions={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to={`/panel/blog-analytics${backQuery}`} className="outline-btn">
              ← بازگشت به تحلیل بلاگ
            </Link>
            {post?.slug && (
              <Link to={`/blog/${post.slug}`} className="outline-btn" target="_blank" rel="noreferrer">
                مشاهده در سایت
              </Link>
            )}
            {post?.id && (
              <Link to="/panel/pages" className="outline-btn">
                مدیریت نوشته‌ها
              </Link>
            )}
          </div>
        )}
      />

      {post && (
        <section className="admin-card blog-post-analytics-hero" style={{ marginBottom: 18 }}>
          <div className="blog-post-analytics-hero-inner">
            {post.cover_url ? (
              <img src={post.cover_url} alt="" className="blog-post-analytics-cover" />
            ) : (
              <span className="blog-post-analytics-cover empty" />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="kpi-hint" style={{ marginBottom: 4 }}>
                {post.is_published ? 'منتشر شده' : 'پیش‌نویس'}
                {post.updated_at ? ` · به‌روزرسانی ${faTime(post.updated_at)}` : ''}
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>{post.title}</h2>
              {post.excerpt && <p className="kpi-hint" style={{ margin: '0 0 10px' }}>{post.excerpt}</p>}
              <div className="blog-post-analytics-meta" style={{ direction: 'ltr', textAlign: 'right' }}>
                <span>{post.path}</span>
                {post.share_path && (
                  <>
                    <span aria-hidden>·</span>
                    <span>goldanil.ir{post.share_path}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

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
        <div className="admin-loading">در حال آماده‌سازی آمار نوشته…</div>
      ) : isError ? (
        <div className="admin-card empty-cell">نوشته یافت نشد یا دسترسی ندارید.</div>
      ) : !data?.available ? (
        <div className="admin-card empty-cell">
          سرویس آمار در دسترس نیست (MongoDB). پس از اتصال، بازدید این نوشته اینجا نمایش داده می‌شود.
        </div>
      ) : (
        <>
          <div className="stat-grid analytics-kpi" style={{ marginBottom: 18 }}>
            <KpiCard label="بازدید امروز" value={faNum(t?.visits_today || 0)} tone="gold" />
            <KpiCard label="خواننده یکتا امروز" value={faNum(t?.unique_today || 0)} tone="up" />
            <KpiCard label="بازدید بازه" value={faNum(t?.visits || 0)} hint="تمام مسیرهای این نوشته" />
            <KpiCard label="خواننده یکتا بازه" value={faNum(t?.unique_visitors || 0)} hint="بر اساس نشست" />
            <KpiCard
              label="میانگین بازدید / خواننده"
              value={faNum(t?.avg_views_per_visitor || 0)}
              hint={`${faNum(eng?.returning_rate || 0)}٪ بازگشتی`}
            />
            <KpiCard label="لینک کوتاه /b/" value={faNum(t?.share_link_views || 0)} hint="ورود از اشتراک‌گذاری" />
            <KpiCard label="مسیر /blog/…" value={faNum(t?.slug_path_views || 0)} hint="ورود از اسلاگ" />
            <KpiCard
              label="اوج ساعتی (UTC)"
              value={peakHour && peakHour.views ? faHour(peakHour.hour) : '—'}
              hint={peakHour && peakHour.views ? `${faNum(peakHour.views)} بازدید` : 'بدون داده'}
            />
          </div>

          <div className="admin-grid-2" style={{ marginBottom: 18 }}>
            <div className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h3>روند بازدید</h3>
                  <p>نمایش روزانه این نوشته</p>
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
                  <h3>توزیع ساعتی</h3>
                  <p>ساعت روز (UTC) — چه زمانی بیشتر خوانده می‌شود</p>
                </div>
              </div>
              <BarSeries
                items={hourly.map((h) => ({
                  label: faNum(h.hour),
                  value: h.views,
                }))}
              />
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

          <div className="admin-card" style={{ marginBottom: 18 }}>
            <div className="admin-card-head">
              <div>
                <h3>مسیرهای ورود</h3>
                <p>اسلاگ، لینک کوتاه و سایر مسیرهای ثبت‌شده برای این نوشته</p>
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
          </div>

          <div className="admin-card">
            <div className="admin-card-head">
              <div>
                <h3>بازدیدهای اخیر</h3>
                <p>۴۰ رویداد آخر این نوشته</p>
              </div>
            </div>
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
                  {(data.recent || []).map((r, i) => (
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
          </div>
        </>
      )}
    </div>
  );
}
