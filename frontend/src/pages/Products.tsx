import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { SecondaryPageChrome } from '../components/SiteChrome';
import { IconSearch } from '../components/icons';
import { faNum } from '../utils/format';
import { mediaUrl } from '../utils/mediaUrl';

const PAGE_SIZE = '24';

export function Products() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const sort = params.get('sort') || '';
  const weightMin = params.get('weight_min') || '';
  const weightMax = params.get('weight_max') || '';
  const feeMax = params.get('fee_max') || '';
  const search = params.get('search') || '';
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: site } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.siteSettings().then((r) => r.data),
    staleTime: 60_000,
  });
  const promo = site?.cms?.products_promo;
  const pageCms = site?.cms?.products_page;
  const promoImg =
    mediaUrl(site?.products_promo_image_url || '') ||
    promo?.image_path ||
    '/home/collection-banner.webp';

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
  const chips = [
    { slug: 'all', name: 'همه', image: null as string | null },
    ...categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      image: mediaUrl(c.image_url || c.image) || null,
    })),
  ];
  const title = search.trim()
    ? `نتایج «${search.trim()}»`
    : category === 'all'
      ? (pageCms?.all_label || 'همه محصولات')
      : categories.find((c) => c.slug === category)?.name || category;

  const activeFilterCount = [
    category !== 'all',
    !!weightMin,
    !!weightMax,
    !!feeMax,
    !!search.trim(),
    !!sort,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setParams((p) => {
      ['category', 'weight_min', 'weight_max', 'fee_max', 'search', 'sort'].forEach((k) => p.delete(k));
      return p;
    });
  };

  const setWeightPreset = (v: string) => {
    setParams((p) => {
      p.delete('weight_min');
      p.delete('weight_max');
      if (v === '0-2') { p.set('weight_min', '0'); p.set('weight_max', '2'); }
      else if (v === '2-5') { p.set('weight_min', '2'); p.set('weight_max', '5'); }
      else if (v === '5-10') { p.set('weight_min', '5'); p.set('weight_max', '10'); }
      else if (v === '10+') { p.set('weight_min', '10'); }
      return p;
    });
  };

  const weightPreset =
    weightMin === '0' && weightMax === '2' ? '0-2'
      : weightMin === '2' && weightMax === '5' ? '2-5'
        : weightMin === '5' && weightMax === '10' ? '5-10'
          : weightMin === '10' && !weightMax ? '10+'
            : '';

  return (
    <SecondaryPageChrome>
      <section className="container products-page handoff-products">
        <nav className="products-crumb" aria-label="مسیر صفحه">
          <Link to="/">{pageCms?.crumb_home || 'خانه'}</Link>
          <span aria-hidden> › </span>
          <span>{pageCms?.all_label || 'محصولات'}</span>
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
          <div className="handoff-products-row1">
            <form
              className="handoff-products-search"
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
              <IconSearch size={16} />
              <input
                name="q"
                type="search"
                key={search}
                defaultValue={search}
                placeholder="جستجوی محصول، نام، کد…"
                enterKeyHint="search"
              />
            </form>
            <div className="filter-chips" role="listbox" aria-label="دسته‌بندی">
              {chips.map((c) => {
                const active = category === c.slug;
                const hasImage = Boolean(c.image);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`filter-chip${active ? ' active' : ''}${hasImage ? ' has-image' : ''}`}
                    onClick={() => setParams((p) => { p.set('category', c.slug); return p; })}
                  >
                    {hasImage ? (
                      <img
                        className="filter-chip-img"
                        src={c.image!}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={40}
                        height={40}
                      />
                    ) : null}
                    <span className="filter-chip-label">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="handoff-products-mobile-actions">
            <button
              type="button"
              className={`handoff-products-filter-btn${filtersOpen ? ' is-open' : ''}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {pageCms?.filter_label || 'فیلترها'}
              {activeFilterCount ? (
                <span className="handoff-products-filter-badge">{faNum(activeFilterCount)}</span>
              ) : null}
            </button>
            <label className="handoff-products-sort-mobile">
              <span className="handoff-products-sort-ico" aria-hidden>⇅</span>
              <select
                aria-label={pageCms?.sort_label || 'مرتب‌سازی'}
                value={sort}
                onChange={(e) => setParams((p) => { p.set('sort', e.target.value); return p; })}
              >
                <option value="">جدیدترین</option>
                <option value="price">ارزان‌ترین</option>
                <option value="-price">گران‌ترین</option>
                <option value="-weight_g">سنگین‌ترین</option>
              </select>
            </label>
          </div>

          {filtersOpen ? (
            <button
              type="button"
              className="handoff-products-filter-backdrop"
              aria-label="بستن فیلترها"
              onClick={() => setFiltersOpen(false)}
            />
          ) : null}
          <div className={`handoff-products-row2${filtersOpen ? ' is-open' : ''}`}>
            <div className="handoff-products-sheet-head">
              <strong>فیلترها</strong>
              <button type="button" className="text-link" onClick={() => setFiltersOpen(false)}>
                بستن
              </button>
            </div>
            <label className="handoff-products-dd">
              <span>عیار</span>
              <select aria-label="عیار" defaultValue="" title="فعلاً همه محصولات ۱۸ عیار هستند">
                <option value="">همه عیارها</option>
                <option value="18">۱۸ عیار</option>
              </select>
            </label>
            <label className="handoff-products-dd">
              <span>وزن (گرم)</span>
              <select
                aria-label="وزن"
                value={weightPreset}
                onChange={(e) => setWeightPreset(e.target.value)}
              >
                <option value="">همه وزن‌ها</option>
                <option value="0-2">تا ۲ گرم</option>
                <option value="2-5">۲ تا ۵ گرم</option>
                <option value="5-10">۵ تا ۱۰ گرم</option>
                <option value="10+">بیش از ۱۰ گرم</option>
              </select>
            </label>
            <label className="handoff-products-dd">
              <span>اجرت ساخت</span>
              <select
                aria-label="اجرت"
                value={feeMax}
                onChange={(e) => setParams((p) => {
                  const v = e.target.value;
                  if (v) p.set('fee_max', v); else p.delete('fee_max');
                  return p;
                })}
              >
                <option value="">همه موارد</option>
                <option value="10">تا ۱۰٪</option>
                <option value="15">تا ۱۵٪</option>
                <option value="25">تا ۲۵٪</option>
              </select>
            </label>
            <label className="handoff-products-dd handoff-products-sort-desktop">
              <span>{pageCms?.sort_label || 'مرتب‌سازی'}</span>
              <select
                aria-label={pageCms?.sort_label || 'مرتب‌سازی'}
                value={sort}
                onChange={(e) => setParams((p) => { p.set('sort', e.target.value); return p; })}
              >
                <option value="">جدیدترین</option>
                <option value="price">ارزان‌ترین</option>
                <option value="-price">گران‌ترین</option>
                <option value="-weight_g">سنگین‌ترین</option>
              </select>
            </label>
            {activeFilterCount ? (
              <button type="button" className="handoff-products-clear" onClick={clearFilters}>
                پاک کردن فیلترها
              </button>
            ) : null}
            <button
              type="button"
              className="gold-btn handoff-products-apply"
              onClick={() => setFiltersOpen(false)}
            >
              اعمال فیلترها
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="product-grid cols-4 handoff-products-grid products-skeleton-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="product-skeleton" aria-hidden />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="products-empty">
            {search
              ? `نتیجه‌ای برای «${search}» پیدا نشد.`
              : (pageCms?.empty || 'محصولی در این فیلتر نیست.')}
          </div>
        ) : (
          <>
            <div className="product-grid cols-4 handoff-products-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            <div className="handoff-products-pager">
              <span>
                نمایش {faNum(1)} تا {faNum(products.length)}
                {totalCount ? <> از {faNum(totalCount)} محصول</> : null}
              </span>
              {hasNextPage ? (
                <button
                  type="button"
                  className="handoff-products-page-btn"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? 'در حال بارگذاری…' : (pageCms?.load_more || 'نمایش محصولات بیشتر')}
                </button>
              ) : null}
            </div>
          </>
        )}

        <aside className="handoff-products-promo" aria-label="کلکسیون">
          <div
            className="handoff-products-promo-media"
            style={{ backgroundImage: `url('${promoImg}')` }}
          />
          <div className="handoff-products-promo-copy">
            <h2>{promo?.title || 'مجموعه‌ای از زیبایی ماندگار'}</h2>
            <p>{promo?.subtitle || 'طراحی‌های خاص، مناسب لحظه‌های مهم زندگی شما'}</p>
            <Link to={promo?.cta_url || '/products'} className="handoff-abhar-cta outline">
              {promo?.cta_label || 'مشاهده کلکسیون'}
              <span aria-hidden>‹</span>
            </Link>
          </div>
        </aside>
      </section>
    </SecondaryPageChrome>
  );
}
