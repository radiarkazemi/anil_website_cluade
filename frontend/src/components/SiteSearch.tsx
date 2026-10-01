import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { calcPrice, faNum, faPrice } from '../utils/format';
import { useStore } from '../store/useStore';
import { IconSearch } from './icons';

type Props = {
  className?: string;
  /** Close mobile menu after submit */
  onSubmitExtra?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
};

const RECENT_KEY = 'anil-recent-searches';
const MAX_RECENT = 8;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string' && x.trim()).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function writeRecent(term: string) {
  const t = term.trim();
  if (!t) return;
  const next = [t, ...readRecent().filter((x) => x !== t)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Global product search — live suggestions, recent queries, category shortcuts. */
export function SiteSearch({
  className = '',
  onSubmitExtra,
  autoFocus,
  placeholder = 'جستجو در گالری…',
}: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQ = params.get('search') || '';
  const [q, setQ] = useState(urlQ);
  const [debounced, setDebounced] = useState(urlQ);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const gp = useStore((s) => s.goldPrice?.price_18k_per_gram ?? 0);

  useEffect(() => {
    setQ(urlQ);
    setDebounced(urlQ);
  }, [urlQ]);

  useEffect(() => {
    setRecent(readRecent());
  }, [open]);

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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-search'],
    queryFn: () => api.categories().then((r) => r.data),
    staleTime: 120_000,
    enabled: open,
  });

  const results = data ?? [];
  const showPanel = open;

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
    if (termNext) writeRecent(termNext);
    setRecent(readRecent());
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

  const clearRecent = () => {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
    setRecent([]);
  };

  const suggestedCats = categories.slice(0, 6);

  return (
    <div className={`site-search-wrap handoff-search${className.includes('compact') ? ' is-compact' : ''} ${className}`.trim()} ref={rootRef}>
      <form className={`site-search${className.includes('compact') ? ' compact' : ''}`} onSubmit={submit} role="search">
        <label className="sr-only" htmlFor={inputId}>جستجوی محصول</label>
        <input
          id={inputId}
          className="site-search-input"
          type="text"
          name="anil-product-search"
          enterKeyHint="search"
          placeholder={placeholder}
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
        />
        {q ? (
          <button
            type="button"
            className="site-search-clear"
            aria-label="پاک کردن"
            onClick={() => {
              setQ('');
              setOpen(true);
            }}
          >
            ✕
          </button>
        ) : null}
        <button type="submit" className="site-search-btn" aria-label="جستجو">
          <IconSearch size={18} />
        </button>
      </form>

      {showPanel ? (
        <div className="site-search-panel handoff-search-panel" role="listbox" aria-label="پیشنهادهای جستجو">
          {recent.length ? (
            <div className="handoff-search-recent">
              <div className="handoff-search-recent-head">
                <strong>جستجوهای اخیر</strong>
                <button type="button" className="text-link" onClick={clearRecent}>
                  پاک کردن همه
                </button>
              </div>
              <div className="handoff-search-recent-pills">
                {recent.map((r) => (
                  <button key={r} type="button" className="handoff-search-pill" onClick={() => goSearch(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {suggestedCats.length ? (
            <div className="handoff-search-cats">
              <strong>دسته‌های پیشنهادی</strong>
              <div className="handoff-search-cat-row">
                {suggestedCats.map((c) => (
                  <Link
                    key={c.id}
                    to={`/products?category=${encodeURIComponent(c.slug)}`}
                    className="handoff-search-cat"
                    onClick={() => {
                      setOpen(false);
                      onSubmitExtra?.();
                    }}
                  >
                    {c.image_url ? <img src={c.image_url} alt="" /> : <span>{c.name.slice(0, 1)}</span>}
                    <em>{c.name}</em>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {term.length >= 2 ? (
            <div className="handoff-search-results">
              <div className="handoff-search-results-head">
                نتایج جستجو برای «{term}»
                {isFetching ? <span>…</span> : null}
              </div>
              {results.length ? (
                <ul className="site-search-list">
                  {results.map((p) => {
                    const hasWeight =
                      p.has_weight !== false && p.weight_g != null && Number(p.weight_g) > 0;
                    const total = hasWeight
                      ? calcPrice(Number(p.weight_g), gp, Number(p.fee_ratio), p.stone_value).total
                      : null;
                    return (
                      <li key={p.id}>
                        <Link
                          to={`/products/${p.slug}`}
                          onClick={() => {
                            writeRecent(term);
                            setOpen(false);
                            onSubmitExtra?.();
                          }}
                        >
                          <span className="site-search-name">{p.name}</span>
                          <span className="site-search-meta">
                            {total != null ? `${faPrice(total)} تومان` : 'استعلام قیمت'}
                            {p.category_name ? ` · ${p.category_name}` : ''}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : !isFetching ? (
                <p className="handoff-search-empty">نتیجه‌ای پیدا نشد.</p>
              ) : null}
              <button type="button" className="outline-btn handoff-search-all" onClick={() => goSearch(term)}>
                مشاهده همه نتایج ({faNum(results.length)}+)
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
