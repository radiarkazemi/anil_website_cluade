import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { api } from '../api/endpoints';
import { SecondaryPageChrome } from '../components/SiteChrome';
import type { ContentPage } from '../types';
import { mediaUrl } from '../utils/mediaUrl';

/** Soft topic from title keywords — not fabricated CMS categories. */
function blogTopic(title: string): string | null {
  if (/تقلب|تشخیص|جعل/.test(title)) return 'آگاهی و تشخیص';
  if (/فرمول|قیمت|اجرت|سکه|شمش|ساخته/.test(title)) return 'بازار و قیمت طلا';
  if (/عیار/.test(title)) return 'آموزش و راهنما';
  return null;
}

function BlogCard({ post, featured = false }: { post: ContentPage; featured?: boolean }) {
  const topic = blogTopic(post.title);
  const to = `/blog/${post.slug}`;

  return (
    <article className={`handoff-blog-card${featured ? ' is-featured' : ''}`}>
      <div className="handoff-blog-body">
        {topic ? <span className="handoff-blog-topic">{topic}</span> : null}
        <h2 className="handoff-blog-title">
          <Link to={to}>{post.title}</Link>
        </h2>
        {post.excerpt ? <p className="handoff-blog-excerpt">{post.excerpt}</p> : null}
        <Link to={to} className="handoff-blog-cta">
          <span aria-hidden className="handoff-blog-cta-chev">‹</span>
          مطالعه مقاله
        </Link>
      </div>
      <Link to={to} className="handoff-blog-cover" tabIndex={-1} aria-hidden>
        {post.cover_url ? (
          <img src={post.cover_url} alt="" loading={featured ? 'eager' : 'lazy'} decoding="async" />
        ) : (
          <div className="handoff-blog-cover-fallback" aria-hidden>
            <span className="handoff-blog-cover-brand">ANIL</span>
            <span className="handoff-blog-cover-title">{post.title}</span>
          </div>
        )}
      </Link>
    </article>
  );
}

export function Blog() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['blog-pages'],
    queryFn: () => api.pages({ type: 'blog' }).then((r) => r.data),
  });

  const { featured, rest, intro } = useMemo(() => {
    const introPage = data.find((p) => p.slug === 'بلاگ');
    const posts = data.filter((p) => p.slug !== 'بلاگ');
    // Prefer a covered «عیار» article as the feature, else first with cover, else first post.
    const preferred =
      posts.find((p) => p.cover_url && /عیار/.test(p.title)) ||
      posts.find((p) => p.cover_url) ||
      posts[0] ||
      null;
    const remaining = preferred ? posts.filter((p) => p.id !== preferred.id) : posts;
    return { featured: preferred, rest: remaining, intro: introPage };
  }, [data]);

  return (
    <SecondaryPageChrome>
      <div className="handoff-blog">
        <header className="handoff-blog-hero">
          <div
            className="handoff-blog-hero-bg"
            style={{ backgroundImage: "url('/home/collection-banner.webp')" }}
            aria-hidden
          />
          <div className="container handoff-blog-hero-inner">
            <h1 className="handoff-blog-hero-title">مجله آنیل</h1>
            <p className="handoff-blog-hero-sub">همه‌چیز درباره طلا، سبک زندگی و بازار</p>
            <p className="handoff-blog-hero-lead">
              {intro?.excerpt?.trim() ||
                'راهنمای خرید، نگهداری، آموزش تخصصی و تحلیل بازار طلا — از گالری آنیل.'}
            </p>
          </div>
        </header>

        <div className="container handoff-blog-main">
          {isLoading ? (
            <p className="handoff-blog-status">در حال بارگذاری…</p>
          ) : (
            <>
              {featured ? (
                <section className="handoff-blog-feature" aria-label="مقاله ویژه">
                  <BlogCard post={featured} featured />
                </section>
              ) : null}

              <section className="handoff-blog-latest" aria-labelledby="blog-latest-title">
                <div className="handoff-blog-latest-head">
                  <h2 id="blog-latest-title">آخرین مطالب مجله</h2>
                  <span className="handoff-blog-latest-line" aria-hidden />
                </div>
                {rest.length ? (
                  <div className="handoff-blog-grid">
                    {rest.map((p) => (
                      <BlogCard key={p.id} post={p} />
                    ))}
                  </div>
                ) : !featured ? (
                  <p className="handoff-blog-status">به‌زودی نوشته‌های تازه منتشر می‌شود.</p>
                ) : null}
              </section>
            </>
          )}
        </div>
      </div>
    </SecondaryPageChrome>
  );
}
