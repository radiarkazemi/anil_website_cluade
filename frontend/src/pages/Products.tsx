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
        <Link to="/">خانه</Link> <span style={{ color: 'var(--text-dim)' }}> / </span> محصولات
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 800 }}>{title}</h1>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>{faNum(products.length)} محصول</div>
      </div>

      <div className="filter-row">
        <div className="filter-chips">
          {chips.map((c) => {
            const active = category === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                className={`filter-chip${active ? ' active' : ''}`}
                onClick={() => setParams((p) => { p.set('category', c.slug); return p; })}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <select
          value={sort}
          onChange={(e) => setParams((p) => { p.set('sort', e.target.value); return p; })}
          className="input"
          style={{ width: 'auto', minWidth: 180 }}
        >
          <option value="">مرتب‌سازی: پیشنهادی</option>
          <option value="price">ارزان‌ترین</option>
          <option value="-price">گران‌ترین</option>
          <option value="-weight_g">سنگین‌ترین</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>در حال بارگذاری…</div>
      ) : (
        <div className="product-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
