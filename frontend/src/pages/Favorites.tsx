import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { api } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { SecondaryPageChrome } from '../components/SiteChrome';
import { useFavorites } from '../store/favoritesStore';
import { usePageSeo } from '../hooks/usePageSeo';

export function Favorites() {
  const ids = useFavorites((s) => s.ids);

  usePageSeo({
    title: 'علاقه‌مندی‌ها | گالری طلا آنیل',
    description: 'محصولات ذخیره‌شده در علاقه‌مندی‌های گالری آنیل.',
    canonicalPath: '/favorites',
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['favorites-products', ids.join(',')],
    queryFn: async () => {
      if (!ids.length) return [];
      // Fetch enough catalogue pages to resolve saved IDs
      const first = await api.products({ page_size: '100' }).then((r) => r.data);
      const found = new Map(first.results.map((p) => [p.id, p]));
      const missing = ids.filter((id) => !found.has(id));
      if (missing.length && first.next) {
        // Best-effort: scan a couple more pages
        let page = 2;
        let next: string | null = first.next;
        while (next && page <= 4 && missing.some((id) => !found.has(id))) {
          const more = await api.products({ page_size: '100', page: String(page) }).then((r) => r.data);
          more.results.forEach((p) => found.set(p.id, p));
          next = more.next;
          page += 1;
        }
      }
      return ids.map((id) => found.get(id)).filter(Boolean) as typeof first.results;
    },
    enabled: ids.length > 0,
  });

  const list = useMemo(() => products, [products]);

  return (
    <SecondaryPageChrome>
      <div className="container handoff-favorites">
        <header className="handoff-favorites-head">
          <h1>علاقه‌مندی‌ها</h1>
          <p>
            {ids.length
              ? `${ids.length} محصول ذخیره‌شده`
              : 'هنوز محصولی ذخیره نکرده‌اید'}
          </p>
        </header>

        {isLoading && ids.length ? (
          <p className="handoff-blog-status">در حال بارگذاری…</p>
        ) : list.length ? (
          <div className="product-grid cols-2 handoff-products-grid">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="handoff-favorites-empty">
            <p>محصولات مورد علاقه‌تان را با ضربان قلب روی کارت‌ها ذخیره کنید.</p>
            <Link to="/products" className="gold-btn">
              مشاهده محصولات
            </Link>
          </div>
        )}
      </div>
    </SecondaryPageChrome>
  );
}
