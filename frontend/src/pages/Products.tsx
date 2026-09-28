import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { SecondaryPageChrome } from '../components/SiteChrome';
import { IconSearch } from '../components/icons';
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      ? 'همه محصولات'
      : categories.find((c) => c.slug === category)?.name || category;

  const activeFilterCount = [
    category !== 'all',
    !!weightMin,
    !!weightMax,
    !!feeMax,
    !!search.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setParams((p) => {
      p.delete('category');
      p.delete('weight_min');
      p.delete('weight_max');
      p.delete('fee_max');
      p.delete('search');
      p.delete('sort');
      return p;
    });
  };

  return (
    <SecondaryPageChrome>
      <section className="container products-page handoff-products">
        <nav className="products-crumb" aria-label="مسیر صفحه">
          <Link to="/">خانه</Link>
          <span aria-hidden> › </span>
          <span>محصولات</span>
        </nav>

        <div className="products-title-row">
          <div>
            <h1 className="products-title">{title}</h1>
            <div className="products-count">
              نمایش {faNum(products.length)} کالا
              {totalCount > products.length ? <> از مجموع {faNum(totalCount)} محصول</> : <> محصول</>}
              {isFetching && !isFetchingNextPage ? <span className="products-fetch-dot" aria-hidden /> : null}
            </div>
          </div>
        </div>

        <div className="handoff-products-toolbar">
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
            <span className="handoff-products-search-ico" aria-hidden>
              <IconSearch size={16} />
            </span>
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
          </form>

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

          <div className="handoff-products-controls">
            <button
              type="button"
              className={`handoff-products-filter-btn${filtersOpen ? ' is-open' : ''}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              فیلترها
              {activeFilterCount ? (
                <span className="handoff-products-filter-badge">{faNum(activeFilterCount)}</span>
              ) : null}
            </button>

            <select
              value={sort}
              onChange={(e) => setParams((p) => { p.set('sort', e.target.value); return p; })}
              className="input filter-sort"
              aria-label="مرتب‌سازی"
            >
              <option value="">مرتب‌سازی: پیشنهادی</option>
              <option value="price">ارزان‌ترین</option>
              <option value="-price">گران‌ترین</option>
              <option value="-weight_g">سنگین‌ترین</option>
            </select>

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

            {activeFilterCount ? (
              <button type="button" className="handoff-products-clear" onClick={clearFilters}>
                پاک کردن فیلترها
              </button>
            ) : null}
          </div>

          {filtersOpen ? (
            <div className="products-smart-filters handoff-products-smart">
              <label>
                <span>وزن از</span>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="گرم"
                  value={weightMin}
                  onChange={(e) => setParams((p) => {
                    const v = e.target.value;
                    if (v) p.set('weight_min', v); else p.delete('weight_min');
                    return p;
                  })}
                />
              </label>
              <label>
                <span>وزن تا</span>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="گرم"
                  value={weightMax}
                  onChange={(e) => setParams((p) => {
                    const v = e.target.value;
                    if (v) p.set('weight_max', v); else p.delete('weight_max');
                    return p;
                  })}
                />
              </label>
              <label>
                <span>اجرت تا ٪</span>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="٪"
                  value={feeMax}
                  onChange={(e) => setParams((p) => {
                    const v = e.target.value;
                    if (v) p.set('fee_max', v); else p.delete('fee_max');
                    return p;
                  })}
                />
              </label>
            </div>
          ) : null}
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
            <div className={`product-grid cols-${cols} handoff-products-grid`}>
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
                  {isFetchingNextPage ? 'در حال بارگذاری…' : 'نمایش محصولات بیشتر'}
                </button>
              </div>
            ) : null}
          </>
        )}

        <aside className="handoff-products-promo" aria-label="کلکسیون">
          <div
            className="handoff-products-promo-bg"
            style={{ backgroundImage: "url('/home/collection-banner.webp')" }}
          />
          <div className="handoff-products-promo-copy">
            <h2>مجموعه‌ای از زیبایی ماندگار</h2>
            <p>طراحی‌های خاص، مناسب لحظه‌های مهم زندگی شما</p>
            <Link to="/products" className="handoff-03-cta">
              <span className="handoff-03-cta-chev" aria-hidden>‹</span>
              مشاهده کلکسیون
            </Link>
          </div>
        </aside>
      </section>
    </SecondaryPageChrome>
  );
}
