import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { faPrice } from '../utils/format';
import { useStore } from '../store/useStore';

type Props = {
  className?: string;
  /** Close mobile menu after submit */
  onSubmitExtra?: () => void;
  autoFocus?: boolean;
};

/** Global product search — live suggestions while typing. */
export function SiteSearch({ className = '', onSubmitExtra, autoFocus }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQ = params.get('search') || '';
  const [q, setQ] = useState(urlQ);
  const [debounced, setDebounced] = useState(urlQ);
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);

  useEffect(() => {
    setQ(urlQ);
    setDebounced(urlQ);
  }, [urlQ]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 220);
    return () => window.clearTimeout(t);
  }, [q]);

  const term = debounced;
  const { data, isFetching } = useQuery({
    queryKey: ['search-live', term],
    queryFn: () =>
      api.products({ search: term, page_size: '6' }).then((r) => r.data.results),
    enabled: term.length >= 2,
    staleTime: 20_000,
  });

  const results = data ?? [];
  const showPanel = open && q.trim().length >= 2;

  useEffect(() => {
    if (!showPanel) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showPanel]);

  const goSearch = (value?: string) => {
    const termNext = (value ?? q).trim();
    const next = new URLSearchParams(params);
    if (termNext) next.set('search', termNext);
    else next.delete('search');
    const qs = next.toString();
    navigate(qs ? `/products?${qs}` : '/products');
    setOpen(false);
    onSubmitExtra?.();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    goSearch();
  };

  return (
    <div className={`site-search-wrap${className.includes('compact') ? ' is-compact' : ''} ${className}`.trim()} ref={rootRef}>
      <form className={`site-search${className.includes('compact') ? ' compact' : ''}`} onSubmit={submit} role="search">
        <label className="sr-only" htmlFor={inputId}>جستجوی محصول</label>
        <input
          id={inputId}
          className="site-search-input"
          type="text"
          name="anil-product-search"
          enterKeyHint="search"
          placeholder="جستجو در گالری…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
        />
        <button type="submit" className="site-search-btn" aria-label="جستجو">
          جستجو
        </button>
      </form>

      {showPanel && (
        <div className="site-search-panel" role="listbox" aria-label="نتایج جستجو">
          {isFetching && !results.length ? (
            <div className="site-search-empty">در حال جستجو…</div>
          ) : results.length === 0 ? (
            <div className="site-search-empty">نتیجه‌ای پیدا نشد</div>
          ) : (
            <ul className="site-search-results">
              {results.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/products/${p.slug}`}
                    className="site-search-hit"
                    onClick={() => {
                      setOpen(false);
                      onSubmitExtra?.();
                    }}
                  >
                    <span className="site-search-hit-media">
                      {p.primary_image ? (
                        <img src={p.primary_image} alt="" />
                      ) : (
                        <em>{p.category_name || 'طلا'}</em>
                      )}
                    </span>
                    <span className="site-search-hit-copy">
                      <strong>{p.name}</strong>
                      <small>{p.category_name}</small>
                      {p.price != null && gp > 0 && (
                        <em>{faPrice(Number(p.price))} تومان</em>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="site-search-all"
            onClick={() => goSearch()}
          >
            مشاهده‌ی همه‌ی نتایج «{q.trim()}»
          </button>
        </div>
      )}
    </div>
  );
}
