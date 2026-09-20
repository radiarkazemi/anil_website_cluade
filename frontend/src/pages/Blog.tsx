import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useSiteSettings } from '../hooks/useOrdersEnabled';
import { faDate, faNum, readingMinutes } from '../utils/format';
import type { ContentPage } from '../types';

const FALLBACK_HERO = '/hero/anil-gallery.jpg';

function PostCard({ post, featured = false }: { post: ContentPage; featured?: boolean }) {
  const mins = readingMinutes(post.excerpt || post.body);
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`blog-post-card${featured ? ' is-featured' : ''}`}
    >
      <div className="blog-post-media">
        {post.cover_url ? (
          <img src={post.cover_url} alt="" loading={featured ? 'eager' : 'lazy'} />
        ) : (
          <div className="blog-post-fallback" aria-hidden />
        )}
      </div>
      <div className="blog-post-body">
        <div className="blog-post-meta">
          <time dateTime={post.created_at}>{faDate(post.created_at)}</time>
          <span aria-hidden>·</span>
          <span>{faNum(mins)} دقیقه مطالعه</span>
        </div>
        <h2>{post.title}</h2>
        {post.excerpt && <p>{post.excerpt}</p>}
        <span className="blog-post-more">ادامه مطلب</span>
      </div>
    </Link>
  );
}

export function Blog() {
  const { data: site } = useSiteSettings();
  const { data = [], isLoading } = useQuery({
    queryKey: ['blog-pages'],
    queryFn: () => api.pages({ type: 'blog' }).then((r) => r.data),
  });

  const posts = data.filter((p) => p.slug !== 'بلاگ');
  const intro = data.find((p) => p.slug === 'بلاگ');
  const [featured, ...rest] = posts;

  const heroSrc =
    featured?.cover_url
    || site?.hero_album?.find((s) => s.is_active)?.image_url
    || site?.hero_image_url
    || FALLBACK_HERO;

  useEffect(() => {
    document.title = 'بلاگ | گالری آنیل';
  }, []);

  return (
    <div className="blog-studio-page">
      <section className="blog-hero">
        <div className="blog-hero-media" aria-hidden>
          <img src={heroSrc} alt="" />
          <div className="blog-hero-veil" />
        </div>
        <div className="blog-hero-wash" aria-hidden />
        <div className="container blog-hero-layout">
          <p className="blog-kicker">{site?.brand_name || 'آنیل'} · مجله گالری</p>
          <h1 className="blog-hero-title">بلاگ</h1>
          <p className="blog-hero-lead">
            {intro?.excerpt
              || 'نکات طلا، بازار، عیار و استایل — نوشته‌هایی برای خرید آگاهانه از گالری آنیل.'}
          </p>
        </div>
      </section>

      <section className="container blog-main section-pad">
        {isLoading ? (
          <div className="blog-loading">در حال بارگذاری نوشته‌ها…</div>
        ) : !posts.length ? (
          <div className="blog-empty">
            <h2>به‌زودی</h2>
            <p>اولین نوشته‌های مجله آنیل به‌زودی اینجا منتشر می‌شود.</p>
            <Link to="/products" className="gold-btn">مشاهده گالری</Link>
          </div>
        ) : (
          <>
            {featured && (
              <div className="blog-featured-wrap">
                <PostCard post={featured} featured />
              </div>
            )}
            {rest.length > 0 && (
              <div className="blog-grid-modern">
                {rest.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
