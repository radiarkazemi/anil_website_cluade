import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';

export function ContentPageView() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['page', slug],
    queryFn: () => api.page(slug).then((r) => r.data),
    enabled: !!slug,
  });

  if (isLoading) {
    return <div className="container section-pad content-page"><p>در حال بارگذاری…</p></div>;
  }
  if (isError || !data) {
    return (
      <div className="container section-pad content-page">
        <h1 className="section-title">صفحه یافت نشد</h1>
        <Link to="/" className="text-link">بازگشت به خانه</Link>
      </div>
    );
  }

  const paragraphs = (data.body || '').split(/\n+/).filter(Boolean);

  return (
    <article className="container section-pad content-page">
      <div className="content-page-head">
        <div className="section-eyebrow">{data.page_type === 'blog' ? 'بلاگ آنیل' : 'راهنما'}</div>
        <h1 className="section-title tight">{data.title}</h1>
        {data.excerpt && <p className="content-excerpt">{data.excerpt}</p>}
      </div>
      {data.cover_url && (
        <div className="content-cover">
          <img src={data.cover_url} alt={data.title} />
        </div>
      )}
      <div className="content-body">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="content-page-foot">
        <Link to={data.page_type === 'blog' ? '/blog' : '/'} className="outline-btn">
          {data.page_type === 'blog' ? 'بازگشت به بلاگ' : 'بازگشت'}
        </Link>
      </div>
    </article>
  );
}
