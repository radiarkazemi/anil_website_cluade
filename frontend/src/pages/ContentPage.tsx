import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ContentBody } from '../components/ContentBody';
import { ShareBar } from '../components/ShareBar';
import { usePageSeo } from '../hooks/usePageSeo';
import { faDate, faNum, readingMinutes } from '../utils/format';

export function ContentPageView() {
  const { slug = '' } = useParams();
  const { pathname } = useLocation();
  const isBlogRoute = pathname.startsWith('/blog/');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['page', slug],
    queryFn: () => api.page(slug).then((r) => r.data),
    enabled: !!slug,
  });

  const isBlog = data?.page_type === 'blog' || isBlogRoute;

  const { data: related = [] } = useQuery({
    queryKey: ['blog-pages'],
    queryFn: () => api.pages({ type: 'blog' }).then((r) => r.data),
    enabled: isBlog,
  });

  useEffect(() => {
    // title handled by usePageSeo when data loads; keep fallback while loading
    if (!data?.title) document.title = 'آنیل';
  }, [data?.title]);

  useEffect(() => {
    if (!data?.id || data.page_type !== 'blog') return;
    const SESSION_KEY = 'anil_vid';
    let sessionId = '';
    try {
      sessionId = sessionStorage.getItem(SESSION_KEY) || '';
      if (!sessionId) {
        sessionId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `v_${Date.now().toString(36)}`;
        sessionStorage.setItem(SESSION_KEY, sessionId);
      }
    } catch {
      sessionId = `v_${Date.now().toString(36)}`;
    }
    api
      .logSiteVisit({
        path: pathname || `/blog/${data.slug}`,
        title: data.title,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        session_id: sessionId,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        screen:
          typeof window !== 'undefined'
            ? `${window.screen?.width || 0}x${window.screen?.height || 0}`
            : '',
        language: typeof navigator !== 'undefined' ? navigator.language : '',
        content_page_id: data.id,
        page_type: 'blog',
        share_code: data.share_code || undefined,
      })
      .catch(() => {});
  }, [data?.id, data?.page_type, data?.slug, data?.title, data?.share_code, pathname]);

  usePageSeo({
    title: data?.title ? `${data.title} | گالری طلا آنیل` : 'گالری طلا آنیل',
    description: data?.excerpt || data?.title || 'گالری طلا آنیل',
    canonicalPath: data
      ? ((data.page_type === 'blog' || isBlogRoute) ? `/blog/${data.slug}` : `/p/${data.slug}`)
      : pathname,
    image: data?.cover_url,
    type: (data?.page_type === 'blog' || isBlogRoute) ? 'article' : 'website',
    jsonLd:
      data && (data.page_type === 'blog' || isBlogRoute)
        ? {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: data.title,
            description: data.excerpt || data.title,
            image: data.cover_url || undefined,
            datePublished: data.created_at,
            dateModified: data.updated_at || data.created_at,
            inLanguage: 'fa-IR',
            author: { '@type': 'Organization', name: 'گالری طلا آنیل' },
            mainEntityOfPage: `https://goldanil.ir/blog/${data.slug}`,
          }
        : undefined,
  });

  if (isLoading) {
    return (
      <div className={`content-shell${isBlog ? ' is-blog' : ''}`}>
        <div className="container section-pad"><p className="blog-loading">در حال بارگذاری…</p></div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="content-shell">
        <div className="container section-pad content-page">
          <h1 className="section-title">صفحه یافت نشد</h1>
          <Link to={isBlog ? '/blog' : '/'} className="text-link">بازگشت</Link>
        </div>
      </div>
    );
  }

  const mins = readingMinutes(data.body);
  const siblings = related
    .filter((p) => p.slug !== 'بلاگ' && p.slug !== data.slug)
    .slice(0, 3);
  const sharePath = data.share_code ? `/b/${data.share_code}` : `/blog/${data.slug}`;

  if (isBlog) {
    return (
      <article className="blog-article-page">
        <header className="blog-article-hero">
          {data.cover_url ? (
            <div className="blog-article-cover">
              <img src={data.cover_url} alt="" />
              <div className="blog-article-veil" />
            </div>
          ) : (
            <div className="blog-article-cover blog-article-cover-empty" aria-hidden>
              <div className="blog-article-veil" />
            </div>
          )}
          <div className="container blog-article-head">
            <Link to="/blog" className="blog-back-link">← بازگشت به بلاگ</Link>
            <p className="blog-kicker">بلاگ آنیل</p>
            <h1>{data.title}</h1>
            {data.excerpt && <p className="blog-article-deck">{data.excerpt}</p>}
            <div className="blog-article-meta">
              <time dateTime={data.created_at}>{faDate(data.created_at)}</time>
              <span aria-hidden>·</span>
              <span>{faNum(mins)} دقیقه مطالعه</span>
              <span aria-hidden>·</span>
              <span className="blog-reads-label">{faNum(data.reads || 0)} بازدید</span>
            </div>
            <ShareBar
              className="blog-share-bar"
              title={data.title}
              excerpt={data.excerpt}
              path={sharePath}
            />
          </div>
        </header>

        <div className="container blog-article-layout">
          <ContentBody body={data.body} className="blog-article-body" />
        </div>

        <div className="container blog-share-foot">
          <ShareBar title={data.title} excerpt={data.excerpt} path={sharePath} />
        </div>

        {siblings.length > 0 && (
          <aside className="container blog-related">
            <header className="blog-related-head">
              <p className="blog-kicker">ادامه بخوانید</p>
              <h2>نوشته‌های مرتبط</h2>
            </header>
            <div className="blog-grid-modern compact">
              {siblings.map((p) => (
                <Link key={p.id} to={`/blog/${p.slug}`} className="blog-post-card">
                  <div className="blog-post-media">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="" loading="lazy" />
                    ) : (
                      <div className="blog-post-fallback" aria-hidden />
                    )}
                  </div>
                  <div className="blog-post-body">
                    <div className="blog-post-meta">
                      <time dateTime={p.created_at}>{faDate(p.created_at)}</time>
                      <span aria-hidden>·</span>
                      <span className="blog-reads-label">{faNum(p.reads || 0)} بازدید</span>
                    </div>
                    <h2>{p.title}</h2>
                    {p.excerpt && <p>{p.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        )}

        <div className="container blog-article-foot">
          <Link to="/blog" className="outline-btn">همه نوشته‌ها</Link>
          <Link to="/products" className="gold-btn">مشاهده گالری</Link>
        </div>
      </article>
    );
  }

  return (
    <article className="content-shell">
      <div className="container section-pad content-page">
        <div className="content-page-head">
          <div className="section-eyebrow">راهنما</div>
          <h1 className="section-title tight">{data.title}</h1>
          {data.excerpt && <p className="content-excerpt">{data.excerpt}</p>}
        </div>
        {data.cover_url && (
          <div className="content-cover">
            <img src={data.cover_url} alt={data.title} />
          </div>
        )}
        <ContentBody body={data.body} />
        <div className="content-page-foot">
          <Link to="/" className="outline-btn">بازگشت</Link>
        </div>
      </div>
    </article>
  );
}

/** Short link landing: /b/:code → canonical blog (or page) URL. */
export function BlogShareRedirect() {
  const { code = '' } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['page-by-code', code],
    queryFn: () => api.pageByShareCode(code).then((r) => r.data),
    enabled: !!code,
  });

  if (isLoading) {
    return (
      <div className="container section-pad">
        <p className="blog-loading">در حال انتقال…</p>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="container section-pad content-page">
        <h1 className="section-title">لینک نامعتبر است</h1>
        <Link to="/blog" className="text-link">بازگشت به بلاگ</Link>
      </div>
    );
  }

  const to = data.page_type === 'blog' ? `/blog/${data.slug}` : `/p/${data.slug}`;
  return <Navigate to={to} replace />;
}
