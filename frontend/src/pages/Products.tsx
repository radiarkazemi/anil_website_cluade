import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { faNum } from '../utils/format';

type GridCols = 3 | 4;
const GRID_KEY = 'anil-product-grid-cols';

export function Products() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const sort = params.get('sort') || '';
  const [cols, setCols] = useState<GridCols>(() => {
    try {
      const saved = Number(localStorage.getItem(GRID_KEY));
      return saved === 3 ? 3 : 4;
    } catch {
      return 4;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(GRID_KEY, String(cols));
    } catch {
      /* ignore */
    }
  }, [cols]);

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
    <section className="container products-page">
      <div className="products-crumb">
        <Link to="/">خانه</Link>
        <span aria-hidden> / </span>
        <span>محصولات</span>
      </div>
      <div className="products-title-row">
        <h1 className="products-title">{title}</h1>
        <div className="products-count">{faNum(products.length)} محصول</div>
      </div>

      <div className="filter-row">
        <div className="filter-chips" role="listbox" aria-label="دسته‌بندی">
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
        <div className="products-toolbar-end">
          <div className="grid-density" role="group" aria-label="تعداد ستون">
            <button
              type="button"
              className={`grid-density-btn${cols === 3 ? ' active' : ''}`}
              aria-pressed={cols === 3}
              title="۳ ستون"
              onClick={() => setCols(3)}
            >
              <span aria-hidden className="grid-density-ico cols-3" />
              <span className="sr-only">۳ ستون</span>
            </button>
            <button
              type="button"
              className={`grid-density-btn${cols === 4 ? ' active' : ''}`}
              aria-pressed={cols === 4}
              title="۴ ستون"
              onClick={() => setCols(4)}
            >
              <span aria-hidden className="grid-density-ico cols-4" />
              <span className="sr-only">۴ ستون</span>
            </button>
          </div>
          <select
            value={sort}
            onChange={(e) => setParams((p) => { p.set('sort', e.target.value); return p; })}
            className="input filter-sort"
          >
            <option value="">مرتب‌سازی: پیشنهادی</option>
            <option value="price">ارزان‌ترین</option>
            <option value="-price">گران‌ترین</option>
            <option value="-weight_g">سنگین‌ترین</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="products-loading">در حال بارگذاری…</div>
      ) : (
        <div className={`product-grid cols-${cols}`}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
