import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ContentBody } from '../components/ContentBody';
import { ShareBar } from '../components/ShareBar';
import { SecondaryPageChrome } from '../components/SiteChrome';
import { usePageSeo } from '../hooks/usePageSeo';
import { faDate, faNum, readingMinutes } from '../utils/format';
import { mediaUrl } from '../utils/mediaUrl';

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

  useEffect(() => {
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
    image: data?.cover_url || undefined,
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
      <SecondaryPageChrome>
        <div className="container section-pad content-page">
          <p>در حال بارگذاری…</p>
        </div>
      </SecondaryPageChrome>
    );
  }

  if (isError || !data) {
    return (
      <SecondaryPageChrome>
        <div className="container section-pad content-page">
          <h1 className="section-title">صفحه یافت نشد</h1>
          <Link to={isBlog ? '/blog' : '/'} className="text-link">بازگشت</Link>
        </div>
      </SecondaryPageChrome>
    );
  }

  const cover = mediaUrl(data.cover_url || '');
  const mins = readingMinutes(data.body);
  const sharePath = data.share_code ? `/b/${data.share_code}` : (isBlog ? `/blog/${data.slug}` : `/p/${data.slug}`);
  const topics = (data.tags || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 4);

  if (isBlog) {
    return (
      <SecondaryPageChrome>
        <article className="container section-pad content-page handoff-article">
          <div className="content-page-head">
            <Link to="/blog" className="handoff-article-back">بازگشت به مجله</Link>
            {topics.length > 0 && (
              <div className="handoff-blog-topics handoff-article-topics">
                {topics.map((topic) => (
                  <span key={topic} className="handoff-blog-topic">{topic}</span>
                ))}
              </div>
            )}
            <h1 className="section-title tight">{data.title}</h1>
            {data.excerpt && <p className="content-excerpt">{data.excerpt}</p>}
            <div className="handoff-article-meta">
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
          {cover && (
            <div className="content-cover">
              <img src={cover} alt={data.title} />
            </div>
          )}
          <div className="content-body">
            <ContentBody body={data.body || ''} />
          </div>
          <div className="blog-share-foot">
            <ShareBar title={data.title} excerpt={data.excerpt} path={sharePath} />
          </div>
          <div className="content-page-foot">
            <Link to="/blog" className="outline-btn">بازگشت به بلاگ</Link>
            <Link to="/products" className="gold-btn">مشاهده گالری</Link>
          </div>
        </article>
      </SecondaryPageChrome>
    );
  }

  return (
    <SecondaryPageChrome>
      <article className="container section-pad content-page handoff-support-page">
        <div className="content-page-head">
          <Link to="/" className="handoff-article-back">بازگشت</Link>
          <div className="section-eyebrow">راهنما و پشتیبانی</div>
          <h1 className="section-title tight">{data.title}</h1>
          {data.excerpt && <p className="content-excerpt">{data.excerpt}</p>}
        </div>
        {cover && (
          <div className="content-cover">
            <img src={cover} alt={data.title} />
          </div>
        )}
        <div className="content-body">
          <ContentBody body={data.body || ''} />
        </div>
        <div className="content-page-foot">
          <Link to="/" className="outline-btn">بازگشت</Link>
        </div>
      </article>
    </SecondaryPageChrome>
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
        <p>در حال انتقال…</p>
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
