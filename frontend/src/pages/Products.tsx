import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { faNum } from '../utils/format';

type GridCols = 3 | 4;
const GRID_KEY = 'anil-product-grid-cols';
const PAGE_SIZE = '24';

export function Products() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const sort = params.get('sort') || '';
  const weightMin = params.get('weight_min') || '';
  const weightMax = params.get('weight_max') || '';
  const feeMax = params.get('fee_max') || '';
  const search = params.get('search') || '';
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

  const listParams = useMemo(() => {
    const p: Record<string, string> = { page_size: PAGE_SIZE };
    if (category !== 'all') p.category = category;
    if (sort) p.ordering = sort;
    if (weightMin) p.weight_min = weightMin;
    if (weightMax) p.weight_max = weightMax;
    if (feeMax) p.fee_max = feeMax;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [category, sort, weightMin, weightMax, feeMax, search]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories().then((r) => r.data),
    staleTime: 120_000,
  });

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['products', listParams],
    queryFn: ({ pageParam }) =>
      api.products({ ...listParams, page: String(pageParam) }).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (!lastPage.next) return undefined;
      return lastPageParam + 1;
    },
    staleTime: 90_000,
    gcTime: 10 * 60_000,
  });

  const categories = categoriesData ?? [];
  const products = data?.pages.flatMap((p) => p.results) ?? [];
  const totalCount = data?.pages[0]?.count ?? products.length;
  const chips = [{ slug: 'all', name: 'همه' }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))];
  const title = search.trim()
    ? `نتایج «${search.trim()}»`
    : category === 'all'
      ? 'همه‌ی محصولات'
      : categories.find((c) => c.slug === category)?.name || category;

  return (
    <section className="container products-page">
      <div className="products-crumb">
        <Link to="/">خانه</Link>
        <span aria-hidden> / </span>
        <span>محصولات</span>
      </div>
      <div className="products-title-row">
        <h1 className="products-title">{title}</h1>
        <div className="products-count">
          {faNum(totalCount)} محصول
          {isFetching && !isFetchingNextPage ? <span className="products-fetch-dot" aria-hidden /> : null}
        </div>
      </div>

      <form
        className="products-search-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const v = String(fd.get('q') || '').trim();
          setParams((p) => {
            if (v) p.set('search', v);
            else p.delete('search');
            return p;
          });
        }}
      >
        <input
          className="input products-search-input"
          name="q"
          type="search"
          key={search}
          defaultValue={search}
          placeholder="جستجو در نام، دسته، توضیحات…"
          enterKeyHint="search"
        />
        <button type="submit" className="gold-btn products-search-submit">جستجو</button>
        {search ? (
          <button
            type="button"
            className="outline-btn"
            onClick={() => setParams((p) => { p.delete('search'); return p; })}
          >
            پاک کردن
          </button>
        ) : null}
      </form>

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
        <div className="products-smart-filters">
          <input className="input" style={{ width: 100 }} placeholder="وزن از" value={weightMin}
            onChange={(e) => setParams((p) => { const v = e.target.value; if (v) p.set('weight_min', v); else p.delete('weight_min'); return p; })} />
          <input className="input" style={{ width: 100 }} placeholder="وزن تا" value={weightMax}
            onChange={(e) => setParams((p) => { const v = e.target.value; if (v) p.set('weight_max', v); else p.delete('weight_max'); return p; })} />
          <input className="input" style={{ width: 110 }} placeholder="اجرت تا ٪" value={feeMax}
            onChange={(e) => setParams((p) => { const v = e.target.value; if (v) p.set('fee_max', v); else p.delete('fee_max'); return p; })} />
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
        <div className={`product-grid cols-${cols} products-skeleton-grid`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="product-skeleton" aria-hidden />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="products-empty">
          {search ? `نتیجه‌ای برای «${search}» پیدا نشد.` : 'محصولی در این فیلتر نیست.'}
        </div>
      ) : (
        <>
          <div className={`product-grid cols-${cols}`}>
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {hasNextPage ? (
            <div className="products-more">
              <button
                type="button"
                className="outline-btn products-more-btn"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? 'در حال بارگذاری…' : 'مشاهده‌ی بیشتر'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
