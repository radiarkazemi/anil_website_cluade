import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { CopyShortLinkButton } from '../components/ShareBar';
import { SecondaryPageChrome } from '../components/SiteChrome';
import { usePageSeo } from '../hooks/usePageSeo';
import type { ContentPage } from '../types';
import { faNum } from '../utils/format';
import { mediaUrl } from '../utils/mediaUrl';

function blogTopics(post: ContentPage): string[] {
  const fromCms = (post.tags || []).map((t) => String(t).trim()).filter(Boolean);
  if (fromCms.length) return fromCms.slice(0, 4);
  const title = post.title || '';
  const guessed: string[] = [];
  if (/تقلب|تشخیص|جعل/.test(title)) guessed.push('آگاهی و تشخیص');
  if (/فرمول|قیمت|اجرت|سکه|شمش|ساخته|بازار|پلتفرم|ورشکست/.test(title)) {
    guessed.push('بازار و قیمت طلا');
  }
  if (/عیار|آموزش|راهنما|خرید/.test(title)) guessed.push('راهنمای خرید');
  if (/نگهدار|مراقبت/.test(title)) guessed.push('نگهداری');
  if (/شناخت|عیار/.test(title)) guessed.push('شناخت طلا');
  return guessed.slice(0, 4);
}

function formatBlogDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fa-IR');
  } catch {
    return '';
  }
}

function estimateReadMins(post: ContentPage): number {
  const text = `${post.excerpt || ''} ${post.title || ''}`;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.min(12, Math.round(words / 40) || 5));
}

function BlogCard({
  post,
  featured = false,
  ctaLabel = 'مطالعه مقاله',
}: {
  post: ContentPage;
  featured?: boolean;
  ctaLabel?: string;
}) {
  const topics = blogTopics(post);
  const to = `/blog/${post.slug}`;
  const date = formatBlogDate(post.created_at || post.updated_at);
  const mins = estimateReadMins(post);

  return (
    <article className={`handoff-blog-card${featured ? ' is-featured' : ''}`}>
      <Link to={to} className="handoff-blog-cover" tabIndex={-1} aria-hidden>
        {post.cover_url ? (
          <img src={mediaUrl(post.cover_url)} alt="" loading={featured ? 'eager' : 'lazy'} decoding="async" />
        ) : (
          <div className="handoff-blog-cover-fallback" aria-hidden>
            <span className="handoff-blog-cover-brand">ANIL</span>
            <span className="handoff-blog-cover-title">{post.title}</span>
          </div>
        )}
        {topics[0] ? <span className="handoff-blog-cover-tag">{topics[0]}</span> : null}
      </Link>
      <div className="handoff-blog-body">
        {topics.length ? (
          <div className="handoff-blog-topics">
            {topics.map((topic) => (
              <span key={topic} className="handoff-blog-topic">{topic}</span>
            ))}
          </div>
        ) : null}
        <h2 className="handoff-blog-title">
          <Link to={to}>{post.title}</Link>
        </h2>
        {post.excerpt ? <p className="handoff-blog-excerpt">{post.excerpt}</p> : null}
        <div className="handoff-blog-meta">
          {date ? <span className="handoff-blog-date">{date}</span> : null}
          <span className="handoff-blog-read">{faNum(mins)} دقیقه مطالعه</span>
          <span className="blog-reads-label">{faNum(post.reads || 0)} بازدید</span>
          {post.share_code ? (
            <CopyShortLinkButton shareCode={post.share_code} label="اشتراک" className="handoff-blog-share" />
          ) : null}
        </div>
        <Link to={to} className="handoff-blog-cta">
          {ctaLabel}
          <span aria-hidden className="handoff-blog-cta-chev">‹</span>
        </Link>
      </div>
    </article>
  );
}

const PAGE_SIZE = 4;

export function Blog() {
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { data = [], isLoading } = useQuery({
    queryKey: ['blog-pages'],
    queryFn: () => api.pages({ type: 'blog' }).then((r) => r.data),
  });

  const { data: site } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.siteSettings().then((r) => r.data),
    staleTime: 60_000,
  });
  const blogCms = site?.cms?.blog;

  usePageSeo({
    title: `${blogCms?.hero_title || 'بلاگ'} | گالری طلا آنیل`,
    description:
      blogCms?.hero_lead ||
      'نکات طلا، بازار، عیار و استایل — نوشته‌های مجله گالری آنیل برای خرید آگاهانه.',
    canonicalPath: '/blog',
  });

  const { allPosts, topics } = useMemo(() => {
    const posts = [...data]
      .filter((p) => p.slug !== 'بلاگ')
      .sort((a, b) => {
        const ao = Number(a.order ?? 0);
        const bo = Number(b.order ?? 0);
        if (ao !== bo) return ao - bo;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      });
    const topicSet = new Set<string>();
    posts.forEach((p) => blogTopics(p).forEach((t) => topicSet.add(t)));
    return { allPosts: posts, topics: Array.from(topicSet).slice(0, 6) };
  }, [data]);

  const filtered = useMemo(() => {
    if (!topicFilter) return allPosts;
    return allPosts.filter((p) => blogTopics(p).includes(topicFilter));
  }, [allPosts, topicFilter]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <SecondaryPageChrome>
      <div className="handoff-blog">
        <header className="handoff-blog-hero handoff-blog-hero-compact">
          <div className="container handoff-blog-hero-inner">
            <h1 className="handoff-blog-hero-title">{blogCms?.hero_title || 'مجله آنیل'}</h1>
            <p className="handoff-blog-hero-sub">
              {blogCms?.hero_subtitle || 'همه‌چیز درباره طلا، سبک زندگی و بازار'}
            </p>
            {topics.length ? (
              <div className="handoff-blog-filters" role="toolbar" aria-label="موضوعات مجله">
                <button
                  type="button"
                  className={`handoff-blog-filter${!topicFilter ? ' is-active' : ''}`}
                  onClick={() => {
                    setTopicFilter(null);
                    setVisible(PAGE_SIZE);
                  }}
                >
                  همه
                </button>
                {topics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`handoff-blog-filter${topicFilter === t ? ' is-active' : ''}`}
                    onClick={() => {
                      setTopicFilter(t);
                      setVisible(PAGE_SIZE);
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className="container handoff-blog-main">
          {isLoading ? (
            <p className="handoff-blog-status">در حال بارگذاری…</p>
          ) : shown.length ? (
            <>
              <section className="handoff-blog-latest" aria-label="مقالات مجله">
                <div className="handoff-blog-stack">
                  {shown.map((p) => (
                    <BlogCard key={p.id} post={p} ctaLabel={blogCms?.cta_label} />
                  ))}
                </div>
              </section>
              {hasMore ? (
                <button
                  type="button"
                  className="handoff-blog-more"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  مقالات بیشتر
                  <span aria-hidden>▾</span>
                </button>
              ) : null}
            </>
          ) : (
            <p className="handoff-blog-status">به‌زودی نوشته‌های تازه منتشر می‌شود.</p>
          )}
        </div>
      </div>
    </SecondaryPageChrome>
  );
}
