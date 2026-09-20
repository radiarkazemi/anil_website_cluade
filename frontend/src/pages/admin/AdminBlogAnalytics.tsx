import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import type { ContentPage } from '../../types';
import { faNum } from '../../utils/format';
import { KpiCard, PageHeader, SparkArea } from './adminShared';

function detailQuery(applied: { days: number; from: string; to: string }) {
  const q = new URLSearchParams();
  if (applied.from || applied.to) {
    if (applied.from) q.set('from', applied.from);
    if (applied.to) q.set('to', applied.to);
  } else {
    q.set('days', String(applied.days));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

type BlogCard = {
  id: string;
  title: string;
  slug: string;
  share_code?: string | null;
  cover_url?: string | null;
  excerpt?: string;
  is_published?: boolean;
  views: number;
  unique_visitors: number;
};

export function AdminBlogAnalytics() {
  const [days, setDays] = useState(14);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applied, setApplied] = useState({ days: 14, from: '', to: '' });
  const [q, setQ] = useState('');

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

  const { data: pagesData } = useQuery({
    queryKey: ['admin-blog-pages-for-analytics'],
    queryFn: async () => {
      const res = await api.adminPages({ page_type: 'blog' });
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw.results || [];
    },
  });

  const cards = useMemo(() => {
    const trafficById = new Map<string, { views: number; unique_visitors: number }>();
    for (const p of data?.top_posts || []) {
      if (p.is_list || !p.content_page_id) continue;
      trafficById.set(String(p.content_page_id), {
        views: Number(p.views || 0),
        unique_visitors: Number(p.unique_visitors || 0),
      });
    }

    const pages = (pagesData || []).filter(
      (p: ContentPage) => p.page_type === 'blog' && p.slug !== 'بلاگ',
    );

    const fromPages: BlogCard[] = pages.map((p: ContentPage) => {
      const stats = trafficById.get(String(p.id));
      return {
        id: String(p.id),
        title: p.title,
        slug: p.slug,
        share_code: p.share_code,
        cover_url: p.cover_url,
        excerpt: p.excerpt,
        is_published: p.is_published,
        views: stats?.views || 0,
        unique_visitors: stats?.unique_visitors || 0,
      };
    });

    // Include traffic-only rows that somehow aren't in the catalog yet
    const seen = new Set(fromPages.map((c) => c.id));
    for (const p of data?.top_posts || []) {
      if (p.is_list || !p.content_page_id || seen.has(String(p.content_page_id))) continue;
      fromPages.push({
        id: String(p.content_page_id),
        title: p.title || p.path,
        slug: p.slug || '',
        share_code: p.share_code,
        cover_url: p.cover_url,
        excerpt: p.excerpt,
        is_published: p.is_published,
        views: Number(p.views || 0),
        unique_visitors: Number(p.unique_visitors || 0),
      });
    }

    fromPages.sort((a, b) => b.views - a.views || a.title.localeCompare(b.title, 'fa'));
    return fromPages;
  }, [data?.top_posts, pagesData]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(needle)
        || (c.slug || '').toLowerCase().includes(needle)
        || (c.share_code || '').toLowerCase().includes(needle),
    );
  }, [cards, q]);

  const t = data?.totals;
  const series = data?.series || [];
  const dq = detailQuery(applied);

  return (
    <div className="blog-analytics">
      <PageHeader
        title="تحلیل بلاگ"
        subtitle="یک نگاه کلی — روی هر نوشته بزنید تا آمار همان نوشته را ببینید"
        actions={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/panel/pages" className="outline-btn">مدیریت نوشته‌ها</Link>
            <button type="button" className="outline-btn" onClick={() => refetch()}>تازه‌سازی</button>
          </div>
        )}
      />

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
        </div>
        <p className="blog-analytics-window kpi-hint">
          {data?.date_from && data?.date_to ? `${data.date_from} ← ${data.date_to}` : '۱۴ روز اخیر'}
          {isFetching ? ' · همگام‌سازی…' : ''}
        </p>
      </section>

      {isLoading && !data ? (
        <div className="admin-loading">در حال آماده‌سازی آمار بلاگ…</div>
      ) : !data?.available ? (
        <div className="admin-card empty-cell">
          سرویس آمار در دسترس نیست (MongoDB). پس از اتصال، بازدیدهای بلاگ اینجا نمایش داده می‌شود.
        </div>
      ) : (
        <>
          <div className="stat-grid blog-analytics-kpis">
            <KpiCard label="بازدید بازه" value={faNum(t?.visits || 0)} tone="gold" />
            <KpiCard label="خواننده یکتا" value={faNum(t?.unique_visitors || 0)} />
            <KpiCard label="بازدید امروز" value={faNum(t?.visits_today || 0)} />
            <KpiCard
              label="نوشته‌ها"
              value={faNum(cards.length)}
              hint={`${faNum(t?.posts_viewed || 0)} در بازه دیده شده`}
            />
          </div>

          {series.length > 0 && (
            <section className="admin-card blog-analytics-trend">
              <div className="admin-card-head">
                <div>
                  <h3>روند کلی</h3>
                  <p>مجموع بازدید مجله در بازه</p>
                </div>
              </div>
              <SparkArea values={series.map((s) => s.visits)} />
            </section>
          )}

          <section className="blog-analytics-catalog">
            <div className="blog-analytics-catalog-head">
              <div>
                <h3>نوشته‌ها</h3>
                <p>روی کارت بزنید تا آمار همان نوشته را ببینید</p>
              </div>
              <input
                className="input blog-analytics-search"
                placeholder="جستجوی عنوان یا کد کوتاه…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {filtered.length === 0 ? (
              <div className="admin-card empty-cell">
                {cards.length === 0
                  ? 'هنوز نوشته‌ای ثبت نشده — از مدیریت نوشته‌ها شروع کنید.'
                  : 'نتیجه‌ای برای این جستجو نیست.'}
              </div>
            ) : (
              <div className="blog-analytics-grid">
                {filtered.map((c) => (
                  <Link
                    key={c.id}
                    to={`/panel/blog-analytics/${c.id}${dq}`}
                    className="blog-analytics-card"
                  >
                    <div className="blog-analytics-card-media">
                      {c.cover_url ? (
                        <img src={c.cover_url} alt="" />
                      ) : (
                        <span className="blog-analytics-card-placeholder" />
                      )}
                      {!c.is_published && <span className="blog-analytics-card-badge">پیش‌نویس</span>}
                    </div>
                    <div className="blog-analytics-card-body">
                      <h4>{c.title}</h4>
                      {c.excerpt ? <p>{c.excerpt}</p> : null}
                      <div className="blog-analytics-card-stats">
                        <span>
                          <strong>{faNum(c.views)}</strong>
                          بازدید
                        </span>
                        <span>
                          <strong>{faNum(c.unique_visitors)}</strong>
                          خواننده
                        </span>
                      </div>
                      <div className="blog-analytics-card-foot">
                        <span className="kpi-hint" dir="ltr">
                          {c.share_code ? `/b/${c.share_code}` : c.slug ? `/blog/${c.slug}` : ''}
                        </span>
                        <span className="blog-analytics-card-cta">مشاهده آمار ←</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
