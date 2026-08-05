import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { faNum } from '../utils/format';

export function Products() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const sort = params.get('sort') || '';

  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => api.categories().then((r) => r.data) });
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', category, sort],
    queryFn: () => {
      const p: Record<string, string> = { page_size: '100' };
      if (category !== 'all') p.category = category;
      if (sort) p.ordering = sort;
      return api.products(p).then((r) => r.data.results);
    },
  });

  const categories = categoriesData ?? [];
  const products = productsData ?? [];
  const chips = [{ slug: 'all', name: 'همه' }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))];
  const title = category === 'all' ? 'همه‌ی محصولات' : categories.find((c) => c.slug === category)?.name || category;

  return (
    <section className="container" style={{ padding: '40px var(--px) 70px', minHeight: '70vh' }}>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
        <Link to="/">خانه</Link> <span style={{ color: '#5c5344' }}>/</span> محصولات
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: 2, color: 'var(--gold-deep)', fontWeight: 600, marginBottom: 8 }}>— گالری آنیل</div>
          <h1 style={{ fontSize: 36, fontWeight: 800 }}>{title}</h1>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>{faNum(products.length)} محصول</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26, paddingBottom: 22, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {chips.map((c) => {
            const active = category === c.slug;
            return (
              <button key={c.slug} onClick={() => setParams((p) => { p.set('category', c.slug); return p; })}
                style={{
                  padding: '9px 16px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 600,
                  color: active ? 'var(--warm)' : '#c8bfb0',
                  background: active ? 'var(--gold-light)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${active ? 'var(--gold-light)' : 'rgba(212,175,55,.2)'}`,
                }}>{c.name}</button>
            );
          })}
        </div>
        <select value={sort} onChange={(e) => setParams((p) => { p.set('sort', e.target.value); return p; })}
          style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid rgba(212,175,55,.3)', fontSize: 13.5 }}>
          <option value="">مرتب‌سازی: پیشنهادی</option>
          <option value="price">ارزان‌ترین</option>
          <option value="-price">گران‌ترین</option>
          <option value="-weight_g">سنگین‌ترین</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>در حال بارگذاری…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
