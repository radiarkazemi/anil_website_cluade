import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';

export function Blog() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['blog-pages'],
    queryFn: () => api.pages({ type: 'blog' }).then((r) => r.data),
  });

  const posts = data.filter((p) => p.slug !== 'بلاگ');
  const intro = data.find((p) => p.slug === 'بلاگ');

  return (
    <div className="container section-pad blog-page">
      <div className="section-row">
        <div>
          <div className="section-eyebrow">گالری آنیل</div>
          <h1 className="section-title tight">بلاگ</h1>
          {intro?.excerpt && <p className="content-excerpt">{intro.excerpt}</p>}
        </div>
      </div>

      {isLoading ? (
        <p>در حال بارگذاری…</p>
      ) : (
        <div className="blog-grid">
          {posts.map((p) => (
            <Link key={p.id} to={`/blog/${p.slug}`} className="blog-card">
              {p.cover_url ? (
                <div className="blog-cover"><img src={p.cover_url} alt="" /></div>
              ) : (
                <div className="blog-cover blog-cover-fallback" />
              )}
              <div className="blog-card-body">
                <h2>{p.title}</h2>
                {p.excerpt && <p>{p.excerpt}</p>}
              </div>
            </Link>
          ))}
          {!posts.length && (
            <p className="content-excerpt">به‌زودی نوشته‌های تازه منتشر می‌شود.</p>
          )}
        </div>
      )}
    </div>
  );
}
